import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify";
import { logger } from "~/utils/logger";
import { createContainer } from "~/shared/container";
import { DateRange } from "~/shared/kernel/DateRange";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Refactored /quote endpoint using use cases.
 * Provides rental price quotes and availability for storefront.
 */
export const quoteLoader = async ({ request }: LoaderFunctionArgs) => {
  // 1. Authentication
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

  // 2. Extract and validate parameters
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
    const startDateObj = new Date(`${startDate}T00:00:00.000Z`);
    const endDateObj = new Date(`${endDate}T00:00:00.000Z`);

    // 3. Look up rental item by Shopify product ID
    const container = createContainer();
    const rentalItemRepo = container.getRentalItemRepository();
    const rentalItem = await rentalItemRepo.findByShopifyProduct(shop, productId);
    
    if (!rentalItem) {
      return json({ ok: false, error: "Rental item not configured" }, { status: 404 });
    }

    // 4. Calculate duration from date range
    const dateRangeResult = DateRange.create(startDateObj, endDateObj);
    if (dateRangeResult.isFailure) {
      return json({ ok: false, error: dateRangeResult.error }, { status: 400 });
    }
    const dateRange = dateRangeResult.value;

    // 5. Calculate pricing using use case
    const pricingUseCase = container.getCalculatePricingUseCase();
    const pricingResult = await pricingUseCase.execute({
      rentalItemId: rentalItem.id,
      durationDays: dateRange.durationDays,
    });

    if (pricingResult.isFailure) {
      return json({ ok: false, error: pricingResult.error }, { status: 400 });
    }

    // 6. Check availability using use case
    const availabilityUseCase = container.getCheckAvailabilityUseCase();
    const availabilityResult = await availabilityUseCase.execute({
      rentalItemId: rentalItem.id,
      startDate: startDateObj,
      endDate: endDateObj,
      requestedUnits: units,
    });

    if (availabilityResult.isFailure) {
      // Still return pricing even if availability check fails
      logger.warn("Availability check failed for quote", { 
        shop, 
        productId, 
        error: availabilityResult.error 
      });
      return json({
        ok: true,
        ...pricingResult.value,
        available: false, // Default to unavailable on error
      });
    }

    // 7. Return combined quote
    return json({
      ok: true,
      ...pricingResult.value,
      available: availabilityResult.value.available,
    });

  } catch (e: any) {
    logger.error("Quote failed", e, { productId, startDate, endDate, shop });
    return json(
      { ok: false, error: "Failed to generate quote" },
      { status: 500 }
    );
  }
};
