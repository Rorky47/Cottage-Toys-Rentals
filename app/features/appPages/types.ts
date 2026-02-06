import type { FetcherWithComponents } from "@remix-run/react";

export type RentalConfigRow = {
  refId: string | null;
  tracked: boolean;
  shopifyProductId: string;
  productTitle: string | null;
  productImageUrl: string | null;
  defaultVariantPrice: string | null;
  shopInventoryOnHand: number | null;
  currencyCode: string;
  rentalItem:
    | null
    | {
        id: string;
        basePricePerDayCents: number;
        pricingAlgorithm: "FLAT" | "TIERED";
        quantity: number;
        rateTiers: Array<{ id: string; minDays: number; pricePerDayCents: number }>;
      };
};

export type RentalFetcher = FetcherWithComponents<any>;

