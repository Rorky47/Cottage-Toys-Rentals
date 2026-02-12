export interface PricingDto {
  rentalItemId: string;
  durationDays: number;
  pricePerDayCents: number;
  totalCents: number;
  currencyCode: string;
  algorithm: string;
  appliedTier?: {
    minDays: number;
    pricePerDayCents: number;
  };
}
