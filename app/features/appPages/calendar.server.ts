import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify";
import { toDateOnly, isBookingStatus, isFulfillmentMethod, type BookingRow } from "~/features/calendar";
import { createContainer } from "~/shared/container";

export type CalendarLoaderData = { year: number; month: number; rows: BookingRow[]; todayDate: string };
export type CalendarActionData = { ok: true } | { ok: false; error: string };

export const loader = async ({ request }: LoaderFunctionArgs): Promise<CalendarLoaderData> => {
  const { session } = await authenticate.admin(request);

  // Clean up expired reservations before showing calendar (new architecture)
  const container = createContainer();
  const cleanupUseCase = container.getCleanupExpiredBookingsUseCase();
  await cleanupUseCase.execute();

  const now = new Date();
  const url = new URL(request.url);

  const todayDate = toDateOnly(now);
  const [todayYearRaw, todayMonthRaw] = todayDate.split("-");
  let year = Number(todayYearRaw);
  let month = Number(todayMonthRaw) - 1; // 0-11

  const qYear = Number(url.searchParams.get("year") ?? "");
  const qMonth = Number(url.searchParams.get("month") ?? ""); // 1-12
  if (Number.isFinite(qYear) && qYear >= 2000 && qYear <= 2100) {
    if (Number.isFinite(qMonth) && qMonth >= 1 && qMonth <= 12) {
      year = qYear;
      month = qMonth - 1;
    }
  }

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));

  const bookings = await prisma.booking.findMany({
    where: {
      rentalItem: { shop: session.shop },
      // Any booking that overlaps the visible month.
      startDate: { lt: monthEnd },
      endDate: { gt: monthStart },
      OR: [
        { status: "CONFIRMED" },
        { status: "RESERVED", expiresAt: { gt: now } },
        { status: "RETURNED" },
      ],
    },
    include: { rentalItem: true },
    orderBy: { startDate: "asc" },
  });

  const rows: BookingRow[] = bookings.map((b) => {
    const fmUnknown = (b as { fulfillmentMethod?: unknown }).fulfillmentMethod;
    const fulfillmentMethod: BookingRow["fulfillmentMethod"] =
      typeof fmUnknown === "string" && isFulfillmentMethod(fmUnknown) ? fmUnknown : "UNKNOWN";

    return {
      id: b.id,
      startDate: toDateOnly(b.startDate),
      endDate: toDateOnly(b.endDate),
      units: b.units,
      rentalItemName: b.rentalItem.name ?? null,
      status: b.status,
      fulfillmentMethod,
      orderId: b.orderId ?? null,
    };
  });

  return { year, month, rows, todayDate };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent !== "update_booking") {
    return json<CalendarActionData>({ ok: false, error: "Unknown action." }, { status: 400 });
  }

  const bookingId = String(formData.get("bookingId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");
  const fulfillmentMethodRaw = String(formData.get("fulfillmentMethod") ?? "");

  if (!bookingId) return json<CalendarActionData>({ ok: false, error: "Missing bookingId." }, { status: 400 });
  if (!isBookingStatus(statusRaw)) {
    return json<CalendarActionData>({ ok: false, error: "Invalid status." }, { status: 400 });
  }
  if (!isFulfillmentMethod(fulfillmentMethodRaw)) {
    return json<CalendarActionData>({ ok: false, error: "Invalid fulfillment method." }, { status: 400 });
  }

  const status: BookingRow["status"] = statusRaw;
  const fulfillmentMethod: BookingRow["fulfillmentMethod"] = fulfillmentMethodRaw;

  const data: { status: BookingRow["status"]; fulfillmentMethod: BookingRow["fulfillmentMethod"]; expiresAt?: null } = {
    status,
    fulfillmentMethod,
  };
  if (status === "CONFIRMED" || status === "RETURNED") data.expiresAt = null;

  const updated = await prisma.booking.updateMany({
    where: { id: bookingId, rentalItem: { shop: session.shop } },
    data,
  });

  if (updated.count === 0) {
    return json<CalendarActionData>({ ok: false, error: "Booking not found." }, { status: 404 });
  }

  return json<CalendarActionData>({ ok: true });
};

