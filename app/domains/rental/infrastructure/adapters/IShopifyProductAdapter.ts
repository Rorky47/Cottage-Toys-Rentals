import { Result } from "~/shared/kernel/Result";

/**
 * Shopify product information needed for rental configuration.
 */
export interface ShopifyProductInfo {
  title: string;
  imageUrl: string | null;
  defaultVariantPriceCents: number;
  totalInventoryQuantity: number;
  currencyCode: string;
}

/**
 * Interface for fetching Shopify product data.
 * Abstracts Shopify GraphQL API behind domain boundary.
 */
export interface IShopifyProductAdapter {
  /**
   * Fetch product details from Shopify by product ID.
   * @param shopifyProductId - Numeric Shopify product ID
   */
  getProductInfo(shopifyProductId: string): Promise<Result<ShopifyProductInfo>>;

  /**
   * Sync rental pricing data to Shopify product metafield.
   * Best-effort operation - doesn't fail if metafield update fails.
   * @returns Result with warning message if sync failed
   */
  syncPricingMetafield(
    shopifyProductId: string,
    basePricePerDayCents: number,
    rateTiers: Array<{ minDays: number; pricePerDayCents: number }>
  ): Promise<Result<void, string>>;

  /**
   * Delete rental pricing metafield from Shopify product.
   * Called when removing rental tracking from a product.
   */
  deleteRentalPricingMetafield(shopifyProductId: string): Promise<Result<void>>;
}
