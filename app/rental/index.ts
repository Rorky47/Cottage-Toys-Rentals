/**
 * Rental module exports
 * 
 * **DEPRECATION NOTICE**:
 * This file exports old architecture functions that are being phased out.
 * See individual file comments for migration paths to new use cases.
 * 
 * **New Architecture Location**: `~/domains/booking`, `~/domains/rental`, `~/domains/pricing`
 * 
 * **Timeline**:
 * - Week 4: Migrate remaining routes
 * - Week 5: Remove deprecated exports
 */

// ⚠️ DEPRECATED - Use CalculatePricingUseCase instead
export * from "./pricing.server";

// ⚠️ DEPRECATED - Use ShopifyMetafieldAdapter (Week 8)
export * from "./pricingMetafield.server";

// ⚠️ DEPRECATED - Use Booking entity instead
export * from "./booking";

// ✅ KEEP - Utility functions still needed
export * from "./date";

// ⚠️ DEPRECATED - Use CheckAvailabilityUseCase instead
export * from "./availability.server";

// ⚠️ DEPRECATED - Will be abstracted in Week 8
export * from "./cache.server";

// ✅ Proxy route exports (these are the actual route handlers)
export { quoteLoader } from "./proxy/quote.server";
export { reserveAction } from "./proxy/reserve.server";
export { unreserveAction } from "./proxy/unreserve.server";
export { checkoutAction } from "./proxy/checkout.server";

