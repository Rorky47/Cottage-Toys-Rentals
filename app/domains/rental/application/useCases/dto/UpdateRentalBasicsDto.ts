/**
 * DTO for updating basic rental item properties (base price and quantity).
 * Used by the admin UI when merchant adjusts pricing or inventory.
 */
export interface UpdateRentalBasicsInput {
  shop: string;
  rentalItemId: string;
  basePricePerDayCents: number;
  quantity: number;
}

export interface UpdateRentalBasicsOutput {
  rentalItemId: string;
  shopifyProductId: string;
  basePricePerDayCents: number;
  quantity: number;
  metafieldSyncSuccess: boolean;
  warning?: string;
}
