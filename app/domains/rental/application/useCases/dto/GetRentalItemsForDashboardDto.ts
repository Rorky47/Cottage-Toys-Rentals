/**
 * DTOs for GetRentalItemsForDashboardUseCase
 */

export interface GetRentalItemsForDashboardInput {
  shop: string;
}

export interface DashboardRateTierDto {
  id: string;
  minDays: number;
  pricePerDayCents: number;
}

export interface DashboardRentalItemDto {
  id: string;
  shopifyProductId: string;
  name: string | null;
  imageUrl: string | null;
  currencyCode: string | null;
  basePricePerDayCents: number;
  pricingAlgorithm: "FLAT" | "TIERED";
  quantity: number;
  rateTiers: DashboardRateTierDto[];
}

export interface GetRentalItemsForDashboardOutput {
  rentalItems: DashboardRentalItemDto[];
}
