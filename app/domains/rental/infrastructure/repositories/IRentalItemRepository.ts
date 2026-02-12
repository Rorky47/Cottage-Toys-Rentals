import type { RentalItem } from "~/domains/rental/domain/entities/RentalItem";

/**
 * Repository interface for RentalItem aggregate.
 * Defines data access contract without implementation details.
 */
export interface IRentalItemRepository {
  findById(id: string): Promise<RentalItem | null>;
  
  findByShopifyProduct(shop: string, shopifyProductId: string): Promise<RentalItem | null>;
  
  findByShop(shop: string): Promise<RentalItem[]>;

  /**
   * Find rental items with rate tier IDs (for display purposes only).
   * Returns raw data with IDs instead of domain entities.
   */
  findByShopWithTierIds(shop: string): Promise<Array<{
    id: string;
    shopifyProductId: string;
    name: string | null;
    imageUrl: string | null;
    currencyCode: string;
    basePricePerDayCents: number;
    pricingAlgorithm: "FLAT" | "TIERED";
    quantity: number;
    rateTiers: Array<{ id: string; minDays: number; pricePerDayCents: number }>;
  }>>;
  
  save(rentalItem: RentalItem): Promise<void>;
  
  delete(id: string): Promise<void>;
}
