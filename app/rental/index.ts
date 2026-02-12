/**
 * Rental module exports
 * 
 * **ARCHITECTURE STATUS**: Migrated to Clean Architecture
 * 
 * This barrel export now only contains:
 * 1. Utility functions (date helpers) - No migration needed
 * 2. Metafield sync function - Working, will be abstracted later
 * 3. Proxy route handlers - Fully migrated to use new use cases
 * 
 * **New Architecture Location**: `~/domains/booking`, `~/domains/rental`, `~/domains/pricing`
 */

// ✅ Utility functions - No migration needed
export * from "./date";

// ✅ Metafield sync - Working, will be abstracted later
export * from "./pricingMetafield.server";

// ✅ Proxy route handlers - Fully migrated
export { quoteLoader } from "./proxy/quote.server";
export { unreserveAction } from "./proxy/unreserve.server";

