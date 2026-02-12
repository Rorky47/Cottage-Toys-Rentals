import type { IShopifyProductAdapter, ShopifyProductInfo } from "../../../domains/rental/infrastructure/adapters/IShopifyProductAdapter";
import { Result } from "../../kernel/Result";

/**
 * Mock Shopify Product Adapter for testing.
 * Simulates Shopify GraphQL API responses.
 */
export class MockShopifyProductAdapter implements IShopifyProductAdapter {
  private products: Map<string, ShopifyProductInfo> = new Map();
  private metafieldSyncCalls: Array<{ shopifyProductId: string; basePriceCents: number; rateTiers: any[] }> = [];
  private shouldFailMetafieldSync = false;

  async getProductInfo(shopifyProductId: string): Promise<Result<ShopifyProductInfo>> {
    const product = this.products.get(shopifyProductId);
    
    if (!product) {
      return Result.fail(`Product ${shopifyProductId} not found`);
    }

    return Result.ok(product);
  }

  async syncPricingMetafield(
    shopifyProductId: string,
    basePricePerDayCents: number,
    rateTiers: Array<{ minDays: number; pricePerDayCents: number }>
  ): Promise<Result<void>> {
    // Check if we should simulate failure
    if (this.shouldFailMetafieldSync) {
      return Result.fail("Failed to sync metafield (simulated error)");
    }

    // Record the call for test assertions
    this.metafieldSyncCalls.push({
      shopifyProductId,
      basePriceCents: basePricePerDayCents,
      rateTiers,
    });

    // Check if product exists
    if (!this.products.has(shopifyProductId)) {
      return Result.fail("Product not found");
    }

    return Result.ok(undefined);
  }

  // Test helper methods

  /**
   * Add a product to the mock Shopify store
   */
  addProduct(shopifyProductId: string, product: ShopifyProductInfo): void {
    this.products.set(shopifyProductId, product);
  }

  /**
   * Clear all products
   */
  clearProducts(): void {
    this.products.clear();
  }

  /**
   * Get all metafield sync calls made during tests
   */
  getMetafieldSyncCalls() {
    return this.metafieldSyncCalls;
  }

  /**
   * Clear metafield sync call history
   */
  clearMetafieldSyncCalls(): void {
    this.metafieldSyncCalls = [];
  }

  /**
   * Get number of metafield sync calls
   */
  getMetafieldSyncCallCount(): number {
    return this.metafieldSyncCalls.length;
  }

  /**
   * Check if metafield was synced for a specific product
   */
  wasMetafieldSyncedFor(shopifyProductId: string): boolean {
    return this.metafieldSyncCalls.some(call => call.shopifyProductId === shopifyProductId);
  }

  /**
   * Configure adapter to simulate metafield sync failures
   */
  setShouldFailMetafieldSync(shouldFail: boolean): void {
    this.shouldFailMetafieldSync = shouldFail;
  }
}
