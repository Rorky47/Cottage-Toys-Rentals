/**
 * DTO for tracking a Shopify product as a rental item.
 * This operation fetches product details from Shopify and creates a rental configuration.
 */
export interface TrackProductInput {
  shop: string;
  shopifyProductId: string;
}

export interface TrackProductOutput {
  rentalItemId: string;
  shopifyProductId: string;
  basePricePerDayCents: number;
  quantity: number;
  metafieldSyncSuccess: boolean;
  warning?: string;
}
