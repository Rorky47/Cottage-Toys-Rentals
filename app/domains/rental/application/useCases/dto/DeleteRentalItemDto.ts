/**
 * DTO for removing a rental item configuration.
 * This deletes the rental configuration but does NOT delete the Shopify product.
 */
export interface DeleteRentalItemInput {
  shop: string;
  shopifyProductId: string;
}

export interface DeleteRentalItemOutput {
  deleted: boolean;
  shopifyProductId: string;
}
