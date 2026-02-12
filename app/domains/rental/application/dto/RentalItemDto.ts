export interface RentalItemDto {
  id: string;
  shop: string;
  shopifyProductId: string;
  name: string | null;
  imageUrl: string | null;
  currencyCode: string;
  basePricePerDayCents: number;
  pricingAlgorithm: string;
  quantity: number;
  rateTiers: Array<{
    minDays: number;
    pricePerDayCents: number;
  }>;
}
