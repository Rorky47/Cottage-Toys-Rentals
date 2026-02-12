import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify";
import { createContainer } from "~/shared/container";
import { logger } from "~/utils/logger";
import { parseDateOnlyToUtcDate } from "~/rental/date";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * NEW ARCHITECTURE: Thin controller for reserve endpoint.
 * 
 * Responsibilities:
 * - Authentication
 * - Request validation
 * - Use case orchestration
 * - Response formatting
 * - Error handling
 * 
 * NO business logic here!
 */
export const reserveActionNew = async ({ request }: ActionFunctionArgs) => {
  // 1. Check HTTP method
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 2. Authenticate
  let session: any = null;
  try {
    ({ session } = await authenticate.public.appProxy(request));
  } catch (e: any) {
    logger.error("Reserve auth failed", e, { shop: (e as { shop?: string })?.shop });
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!session) {
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse and validate request
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

  // Validate required fields
  if (!productId || !startDateStr || !endDateStr || !Number.isFinite(units) || units <= 0) {
    return json({ ok: false, error: "Missing/invalid parameters" }, { status: 400 });
  }
  if (!cartToken) {
    return json({ ok: false, error: "Missing cart token" }, { status: 400 });
  }
  if (!DATE_ONLY_REGEX.test(startDateStr) || !DATE_ONLY_REGEX.test(endDateStr)) {
    return json({ ok: false, error: "Invalid date format; use YYYY-MM-DD" }, { status: 400 });
  }

  // Parse dates
  let startDate: Date;
  let endDate: Date;
  try {
    startDate = parseDateOnlyToUtcDate(startDateStr);
    endDate = parseDateOnlyToUtcDate(endDateStr);
  } catch {
    return json({ ok: false, error: "Invalid date range" }, { status: 400 });
  }

  // 4. Execute use cases
  const container = createContainer();

  try {
    // Find rental item by Shopify product ID
    const rentalItem = await container.getRentalItemRepository().findByShopifyProductId(session.shop, productId);
    if (!rentalItem) {
      return json({ ok: false, error: "Rental item not configured" }, { status: 404 });
    }

    // Create or update booking reservation
    const bookingResult = await container.getCreateBookingUseCase().execute({
      rentalItemId: rentalItem.id,
      cartToken,
      startDate,
      endDate,
      units,
      fulfillmentMethod: "UNKNOWN",
    });

    if (bookingResult.isFailure) {
      const statusCode = bookingResult.error.includes("Not enough units") ? 409 : 400;
      return json({ ok: false, error: bookingResult.error }, { status: statusCode });
    }

    const booking = bookingResult.value;

    // Calculate pricing
    const pricingResult = await container.getCalculatePricingUseCase().execute({
      rentalItemId: rentalItem.id,
      durationDays: booking.durationDays,
    });

    if (pricingResult.isFailure) {
      logger.error("Pricing calculation failed", { error: pricingResult.error });
      return json({ ok: false, error: "Failed to calculate pricing" }, { status: 500 });
    }

    const pricing = pricingResult.value;
    const lineTotalCents = pricing.totalCents * units;

    // 5. Return response
    return json({
      ok: true,
      rentalDays: booking.durationDays,
      units: booking.units,
      pricePerDayCents: pricing.pricePerDayCents,
      unitTotalCents: pricing.totalCents,
      lineTotalCents,
      bookingRef: booking.id,
    });
  } catch (e: any) {
    logger.error("Reserve failed", e, {
      productId,
      startDate: startDateStr,
      endDate: endDateStr,
      shop: session.shop,
    });
    return json({ ok: false, error: "Failed to reserve" }, { status: 500 });
  }
};
