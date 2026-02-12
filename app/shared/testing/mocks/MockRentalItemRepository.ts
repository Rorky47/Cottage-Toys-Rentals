import type { IRentalItemRepository } from "~/domains/rental/infrastructure/repositories/IRentalItemRepository";
import { RentalItem } from "~/domains/rental/domain/entities/RentalItem";

/**
 * Mock rental item repository for testing.
 * Stores rental items in memory.
 */
export class MockRentalItemRepository implements IRentalItemRepository {
  private items: Map<string, RentalItem> = new Map();

  async findById(id: string): Promise<RentalItem | null> {
    return this.items.get(id) || null;
  }

  async findByShopifyProduct(
    shop: string,
    shopifyProductId: string
  ): Promise<RentalItem | null> {
    const all = Array.from(this.items.values());
    return (
      all.find((item) => item.shop === shop && item.shopifyProductId === shopifyProductId) || null
    );
  }

  async findByShop(shop: string): Promise<RentalItem[]> {
    const all = Array.from(this.items.values());
    return all.filter((item) => item.shop === shop);
  }

  async save(rentalItem: RentalItem): Promise<void> {
    this.items.set(rentalItem.id, rentalItem);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  // Test helper methods
  clear(): void {
    this.items.clear();
  }

  count(): number {
    return this.items.size;
  }

  getAll(): RentalItem[] {
    return Array.from(this.items.values());
  }
}
