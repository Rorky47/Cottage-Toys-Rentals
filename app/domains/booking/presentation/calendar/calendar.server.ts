import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify";
import { toDateOnly, isBookingStatus, isFulfillmentMethod, type BookingRow } from "~/domains/booking/presentation/calendar/utils";
import { createContainer } from "~/shared/container";

export type CalendarLoaderData = { year: number; month: number; rows: BookingRow[]; todayDate: string };
export type CalendarActionData = { ok: true } | { ok: false; error: string };

/**
 * Calendar loader - migrated to use GetCalendarBookingsUseCase
 */
export const loader = async ({ request }: LoaderFunctionArgs): Promise<CalendarLoaderData> => {
  const { session } = await authenticate.admin(request);

  // Clean up expired reservations before showing calendar
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

  // Fetch bookings using use case
  const getBookingsUseCase = container.getGetCalendarBookingsUseCase();
  const result = await getBookingsUseCase.execute({
    shop: session.shop,
    year,
    month,
  });

  if (result.isFailure) {
    throw new Error(result.error);
  }

  // Map DTOs to BookingRow format (view model)
  const rows: BookingRow[] = result.value.bookings.map((b) => {
    const fmUnknown = b.fulfillmentMethod as unknown;
    const fulfillmentMethod: BookingRow["fulfillmentMethod"] =
      typeof fmUnknown === "string" && isFulfillmentMethod(fmUnknown) ? fmUnknown : "UNKNOWN";

    return {
      id: b.id,
      startDate: b.startDate,
      endDate: b.endDate,
      units: b.units,
      rentalItemName: b.rentalItemName,
      status: b.status,
      fulfillmentMethod,
      orderId: b.orderId,
    };
  });

  return { year, month, rows, todayDate };
};

/**
 * Calendar action - migrated to use UpdateBookingStatusUseCase
 */
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

  // Use UpdateBookingStatusUseCase
  const container = createContainer();
  const updateUseCase = container.getUpdateBookingStatusUseCase();
  const result = await updateUseCase.execute({
    shop: session.shop,
    bookingId,
    status: statusRaw as "RESERVED" | "CONFIRMED" | "CANCELLED" | "RETURNED",
    fulfillmentMethod: fulfillmentMethodRaw as "SHIP" | "PICKUP" | "UNKNOWN",
  });

  if (result.isFailure) {
    return json<CalendarActionData>({ ok: false, error: result.error }, { status: 404 });
  }

  return json<CalendarActionData>({ ok: true });
};

