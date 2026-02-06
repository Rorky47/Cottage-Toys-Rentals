import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify";
import {
  getCachedRentalItem,
  isAvailable,
  quoteRentalPricing,
  setCachedRentalItem,
} from "~/rental";
import { logger } from "~/utils/logger";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const quoteLoader = async ({ request }: LoaderFunctionArgs) => {
  let session: any = null;
  try {
    ({ session } = await authenticate.public.appProxy(request));
  } catch (e: any) {
    logger.error("Quote auth failed", e, { shop: (e as { shop?: string })?.shop });
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!session) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const shop = session.shop;
  const url = new URL(request.url);

  const productId = url.searchParams.get("product_id") ?? "";
  const startDate = url.searchParams.get("start_date") ?? "";
  const endDate = url.searchParams.get("end_date") ?? "";
  const unitsRaw = url.searchParams.get("units") ?? "1";

  const units = Math.floor(Number(unitsRaw));
  if (!productId || !startDate || !endDate || !Number.isFinite(units) || units <= 0) {
    return json({ ok: false, error: "Missing/invalid parameters" }, { status: 400 });
  }

  if (!DATE_ONLY_REGEX.test(startDate) || !DATE_ONLY_REGEX.test(endDate)) {
    return json(
      { ok: false, error: "Invalid date format; use YYYY-MM-DD" },
      { status: 400 }
    );
  }
  if (endDate < startDate) {
    return json(
      { ok: false, error: "End date must be on or after start date" },
      { status: 400 }
    );
  }

  try {
    let rentalItem = getCachedRentalItem(shop, productId);
    if (!rentalItem) {
      const fromDb = await prisma.rentalItem.findUnique({
        where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        include: { rateTiers: { orderBy: { minDays: "asc" } } },
      });
      if (!fromDb) {
        return json({ ok: false, error: "Rental item not configured" }, { status: 404 });
      }
      rentalItem = {
        id: fromDb.id,
        shop: fromDb.shop,
        shopifyProductId: fromDb.shopifyProductId,
        name: fromDb.name,
        basePricePerDayCents: fromDb.basePricePerDayCents,
        quantity: fromDb.quantity,
        rateTiers: fromDb.rateTiers.map((t) => ({
          minDays: t.minDays,
          pricePerDayCents: t.pricePerDayCents,
        })),
      };
      setCachedRentalItem(shop, productId, rentalItem);
    }

    const quote = quoteRentalPricing({
      startDate: startDate as any,
      endDate: endDate as any,
      units,
      basePricePerDayCents: rentalItem.basePricePerDayCents,
      tiers: rentalItem.rateTiers,
    });

    const startDateObj = new Date(`${startDate}T00:00:00.000Z`);
    const endDateObj = new Date(`${endDate}T00:00:00.000Z`);
    const available = await isAvailable(
      rentalItem.id,
      startDateObj,
      endDateObj,
      units
    );

    return json({ ok: true, ...quote, available });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return json({ ok: false, error: "Rental item not configured" }, { status: 404 });
    }
    logger.error("Quote failed", e, {
      productId,
      startDate,
      endDate,
      shop,
    });
    return json(
      { ok: false, error: "Failed to generate quote" },
      { status: 500 }
    );
  }
};
