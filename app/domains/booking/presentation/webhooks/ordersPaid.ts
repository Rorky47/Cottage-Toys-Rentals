import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify";
import { createContainer } from "~/shared/container";
import { parseDateOnlyToUtcDate } from "~/rental/date";

type LineItemProperty =
  | { name?: string; value?: string }
  | { key?: string; value?: string };

function getProperty(properties: LineItemProperty[] | undefined, key: string): string | null {
  if (!properties) return null;
  for (const p of properties) {
    const k = (p as any)?.name ?? (p as any)?.key;
    const v = (p as any)?.value;
    if (k === key && typeof v === "string") return v;
  }
  return null;
}

type RentalLineKey = string;
function makeRentalLineKey(productId: string, start: string, end: string): RentalLineKey {
  return `${productId}|${start}|${end}`;
}

function inferFulfillmentMethodFromOrder(order: any): "SHIP" | "PICKUP" | "UNKNOWN" {
  const lines = order?.shipping_lines ?? order?.shippingLines ?? null;
  if (Array.isArray(lines) && lines.length > 0) {
    for (const sl of lines) {
      const deliveryCategory = String(sl?.delivery_category ?? sl?.deliveryCategory ?? "").toLowerCase();
      const title = String(sl?.title ?? "").toLowerCase();
      const code = String(sl?.code ?? "").toLowerCase();
      if (deliveryCategory.includes("pickup") || title.includes("pickup") || code.includes("pickup")) {
        return "PICKUP";
      }
    }
    // Has a shipping line but none indicate pickup → treat as shipped/delivered.
    return "SHIP";
  }

  return "UNKNOWN";
}

function countRentalDays(startDateStr: string, endDateStr: string): number {
  const start = parseDateOnlyToUtcDate(startDateStr);
  const end = parseDateOnlyToUtcDate(endDateStr);
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
  return days > 0 ? days : 1;
}

/**
 * Webhook handler for orders/paid event.
 * Confirms rental bookings when an order is paid.
 * 
 * Refactored to use Clean Architecture use cases:
 * - UpsertRentalItemUseCase: Auto-track products if not configured
 * - ConfirmBookingByIdUseCase: Promote bookings by booking reference
 * - PromoteBookingByDatesUseCase: Fallback to promote by date match
 * - CreateConfirmedBookingUseCase: Final fallback to create new booking
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const container = createContainer();
    const order = payload as any;
    const orderId = String(order?.id ?? order?.admin_graphql_api_id ?? "");
    const currency = String(order?.currency ?? "USD");
    const fulfillmentMethod = inferFulfillmentMethodFromOrder(order);

    const lineItems = (order?.line_items as any[]) ?? [];

    // Aggregate quantity by (productId, start, end)
    const aggregated = new Map<
      RentalLineKey,
      {
        productId: string;
        start: string;
        end: string;
        units: number;
        title: string | null;
        unitPriceStr: string | null;
        bookingRef: string | null;
      }
    >();

    for (const li of lineItems) {
      const props = (li?.properties as LineItemProperty[]) ?? undefined;
      const rentalStart = getProperty(props, "_rental_start") || getProperty(props, "Rental Start Date") || getProperty(props, "rental_start");
      const rentalEnd = getProperty(props, "_rental_end") || getProperty(props, "Rental Return Date") || getProperty(props, "rental_end");
      const bookingRef = getProperty(props, "_booking_ref") || getProperty(props, "booking_ref");

      console.log(`[ordersPaid] Line item properties:`, JSON.stringify(props));
      console.log(`[ordersPaid] Extracted: start=${rentalStart}, end=${rentalEnd}, bookingRef=${bookingRef}`);

      if (!rentalStart || !rentalEnd) continue; // not a rental line

      const productId = li?.product_id;
      if (!productId) continue;

      const units = Math.floor(Number(li?.quantity ?? 1));
      if (!Number.isFinite(units) || units <= 0) continue;

      const key = makeRentalLineKey(String(productId), rentalStart, rentalEnd);
      const prev = aggregated.get(key);
      aggregated.set(key, {
        productId: String(productId),
        start: rentalStart,
        end: rentalEnd,
        units: (prev?.units ?? 0) + units,
        title: prev?.title ?? (typeof li?.title === "string" ? li.title : null),
        unitPriceStr: prev?.unitPriceStr ?? (li?.price != null ? String(li.price) : null),
        bookingRef: prev?.bookingRef ?? bookingRef,
      });
    }

    // Process each aggregated rental line
    for (const entry of aggregated.values()) {
      let rentalDays = 0;
      try {
        rentalDays = countRentalDays(entry.start, entry.end);
      } catch {
        console.error(`[ordersPaid] Invalid date range: ${entry.start} to ${entry.end}`);
        continue;
      }

      const unitTotalStr = entry.unitPriceStr ?? "0";
      const unitTotalCents = Math.round(Number(unitTotalStr) * 100);
      const basePerDayCents = rentalDays > 0 ? Math.round(unitTotalCents / rentalDays) : 0;

      // 1. Upsert rental item (auto-track if not configured)
      const upsertRentalItemUseCase = container.getUpsertRentalItemUseCase();
      const rentalItemResult = await upsertRentalItemUseCase.execute({
        shop,
        shopifyProductId: entry.productId,
        name: entry.title,
        imageUrl: null,
        currencyCode: currency,
        basePricePerDayCents: basePerDayCents,
      });

      if (rentalItemResult.isFailure) {
        console.error(`[ordersPaid] Failed to upsert rental item: ${rentalItemResult.error}`);
        continue;
      }

      const rentalItem = rentalItemResult.value;
      const startDate = parseDateOnlyToUtcDate(entry.start);
      const endDate = parseDateOnlyToUtcDate(entry.end);

      // 2. Try to promote existing RESERVED booking by booking reference
      if (entry.bookingRef) {
        console.log(`[ordersPaid] Attempting to confirm booking ${entry.bookingRef}`);
        
        const confirmByIdUseCase = container.getConfirmBookingByIdUseCase();
        const confirmResult = await confirmByIdUseCase.execute({
          bookingId: entry.bookingRef,
          orderId,
          units: entry.units,
          fulfillmentMethod,
        });

        if (confirmResult.isSuccess) {
          console.log(`[ordersPaid] Successfully confirmed booking ${entry.bookingRef}`);
          continue;
        }

        console.log(`[ordersPaid] Could not confirm booking ${entry.bookingRef}: ${confirmResult.error}`);
      }

      // 3. Check if already confirmed for this order (idempotency)
      const bookingRepo = container.getBookingRepository();
      const existingBookings = await bookingRepo.findByRentalItemAndDateRange(
        rentalItem.id,
        startDate,
        endDate
      );

      const alreadyConfirmed = existingBookings.some((b) => b.orderId === orderId);
      if (alreadyConfirmed) {
        console.log(`[ordersPaid] Booking already confirmed for order ${orderId}`);
        continue;
      }

      // 4. Try to promote RESERVED booking by dates
      console.log(`[ordersPaid] Attempting to promote RESERVED booking by dates`);
      const promoteByDatesUseCase = container.getPromoteBookingByDatesUseCase();
      const promoteResult = await promoteByDatesUseCase.execute({
        rentalItemId: rentalItem.id,
        startDate,
        endDate,
        orderId,
        units: entry.units,
        fulfillmentMethod,
      });

      if (promoteResult.isSuccess && promoteResult.value !== null) {
        console.log(`[ordersPaid] Successfully promoted RESERVED booking by dates`);
        continue;
      }

      // 5. Final fallback: Create new CONFIRMED booking
      console.log(`[ordersPaid] Creating new CONFIRMED booking for order ${orderId}`);
      const createConfirmedUseCase = container.getCreateConfirmedBookingUseCase();
      const createResult = await createConfirmedUseCase.execute({
        rentalItemId: rentalItem.id,
        orderId,
        startDate,
        endDate,
        units: entry.units,
        fulfillmentMethod,
      });

      if (createResult.isFailure) {
        console.error(`[ordersPaid] Failed to create confirmed booking: ${createResult.error}`);
        continue;
      }

      console.log(`[ordersPaid] Successfully created confirmed booking`);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error(`[webhook] ORDERS_PAID failed:`, error);
    // Return 500 so Shopify will retry the webhook
    return new Response("Internal Server Error", { status: 500 });
  }
};
