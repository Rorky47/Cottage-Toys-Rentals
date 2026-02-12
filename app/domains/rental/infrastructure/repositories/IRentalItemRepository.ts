import type { RentalItem } from "~/domains/rental/domain/entities/RentalItem";

/**
 * Repository interface for RentalItem aggregate.
 * Defines data access contract without implementation details.
 */
export interface IRentalItemRepository {
  findById(id: string): Promise<RentalItem | null>;
  
  findByShopifyProduct(shop: string, shopifyProductId: string): Promise<RentalItem | null>;
  
  findByShop(shop: string): Promise<RentalItem[]>;
  
  save(rentalItem: RentalItem): Promise<void>;
  
  delete(id: string): Promise<void>;
}
