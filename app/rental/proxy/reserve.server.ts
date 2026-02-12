/**
 * @deprecated DEPRECATED - This route is superseded by reserve.new.ts
 * 
 * **Replacement**: `~/domains/booking/presentation/routes/reserve.new.ts`
 * 
 * **Why deprecated**: 
 * - Uses old domain functions (isAvailable, calculatePrice)
 * - Direct Prisma access instead of repositories
 * 
 * **Timeline**: Week 4 - swap to reserve.new.ts
 * 
 * **Status**: MARKED FOR REMOVAL
 */

import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify";
import {
  countRentalDays,
  isAvailable,
  parseDateOnlyToUtcDate,
  RESERVATION_TTL_MS,
  reservedOrderId,
} from "~/rental";
import { logger } from "~/utils/logger";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const reserveAction = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let session: any = null;
  try {
    ({ session } = await authenticate.public.appProxy(request));
  } catch (e: any) {
    logger.error("Reserve auth failed", e, { shop: (e as { shop?: string })?.shop });
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!session) return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const shop = session.shop;

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const productId = String(body?.product_id ?? body?.productId ?? "");
  const startDateStr = String(body?.start_date ?? body?.startDate ?? "");
  const endDateStr = String(body?.end_date ?? body?.endDate ?? "");
  const units = Math.floor(Number(body?.units ?? 1));
  const cartToken = String(body?.cart_token ?? body?.cartToken ?? "");
  const rentalDaysRaw = body?.rental_days ?? body?.rentalDays ?? null;

  if (!productId || !startDateStr || !endDateStr || !Number.isFinite(units) || units <= 0) {
    return json({ ok: false, error: "Missing/invalid parameters" }, { status: 400 });
  }
  if (!cartToken) {
    return json({ ok: false, error: "Missing cart token." }, { status: 400 });
  }
  if (!DATE_ONLY_REGEX.test(startDateStr) || !DATE_ONLY_REGEX.test(endDateStr)) {
    return json(
      { ok: false, error: "Invalid date format; use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  let rentalDays = 0;
  try {
    rentalDays = rentalDaysRaw ? Math.floor(Number(rentalDaysRaw)) : 0;
    if (!Number.isFinite(rentalDays) || rentalDays <= 0) {
      rentalDays = countRentalDays(startDateStr, endDateStr);
    }
  } catch {
    return json({ ok: false, error: "Invalid date range." }, { status: 400 });
  }

  try {
    const rentalItem = await prisma.rentalItem.findFirst({
      where: {
        shop,
        shopifyProductId: productId,
      },
    });

    if (!rentalItem) {
      return json({ ok: false, error: "Rental item not configured" }, { status: 404 });
    }

    const startDate = parseDateOnlyToUtcDate(startDateStr);
    const endDate = parseDateOnlyToUtcDate(endDateStr);

    const available = await isAvailable(rentalItem.id, startDate, endDate, units);
    if (!available) {
      return json(
        { ok: false, error: "Not enough availability for this date range" },
        { status: 409 }
      );
    }

    const reservedId = reservedOrderId(cartToken);
    const hold = await prisma.booking.findFirst({
      where: {
        rentalItemId: rentalItem.id,
        orderId: reservedId,
        startDate,
        endDate,
        status: "RESERVED",
      },
    });

    let bookingRef: string;
    if (hold?.id) {
      await prisma.booking.update({
        where: { id: hold.id },
        data: {
          units,
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        },
      });
      bookingRef = hold.id;
    } else {
      const newBooking = await prisma.booking.create({
        data: {
          rentalItemId: rentalItem.id,
          orderId: reservedId,
          startDate,
          endDate,
          units,
          status: "RESERVED",
          expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
        },
      });
      bookingRef = newBooking.id;
    }

    const total = rentalItem.basePricePerDayCents * rentalDays * units;

    return json({
      ok: true,
      rentalDays,
      units,
      pricePerDayCents: rentalItem.basePricePerDayCents,
      unitTotalCents: rentalItem.basePricePerDayCents * rentalDays,
      lineTotalCents: total,
      bookingRef, // Return the unique booking ID
    });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return json({ ok: false, error: "Rental item not configured" }, { status: 404 });
    }
    logger.error("Reserve failed", e, {
      productId,
      startDate: startDateStr,
      endDate: endDateStr,
      shop,
    });
    return json({ ok: false, error: "Failed to reserve" }, { status: 500 });
  }
};
