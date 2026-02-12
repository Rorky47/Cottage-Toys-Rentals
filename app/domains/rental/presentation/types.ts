import type { FetcherWithComponents } from "@remix-run/react";

export type RentalConfigRow = {
  shopifyProductId: string;
  productTitle: string | null;
  productImageUrl: string | null;
  defaultVariantPrice: string | null;
  shopInventoryOnHand: number | null;
  currencyCode: string;
  rentalItem: {
    id: string;
    basePricePerDayCents: number;
    pricingAlgorithm: "FLAT" | "TIERED";
    quantity: number;
    rateTiers: Array<{ id: string; minDays: number; pricePerDayCents: number }>;
  };
};

export type RentalFetcher = FetcherWithComponents<any>;

