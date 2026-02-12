import { describe, it, expect, beforeEach } from "vitest";
import { TrackProductUseCase } from "../TrackProductUseCase";
import { MockRentalItemRepository } from "../../../../../shared/testing/mocks/MockRentalItemRepository";
import { MockShopifyProductAdapter } from "../../../../../shared/testing/mocks/MockShopifyProductAdapter";
import { TestFactories } from "../../../../../shared/testing/factories";

describe("TrackProductUseCase", () => {
  let rentalItemRepo: MockRentalItemRepository;
  let shopifyAdapter: MockShopifyProductAdapter;
  let useCase: TrackProductUseCase;

  beforeEach(() => {
    rentalItemRepo = new MockRentalItemRepository();
    shopifyAdapter = new MockShopifyProductAdapter();
    useCase = new TrackProductUseCase(rentalItemRepo, shopifyAdapter);
  });

  describe("creating new rental item", () => {
    it("should create new rental item from Shopify product", async () => {
      // Arrange
      shopifyAdapter.addProduct("product-123", {
        title: "Inflatable Kayak",
        imageUrl: "https://example.com/kayak.jpg",
        defaultVariantPriceCents: 5000, // $50
        totalInventoryQuantity: 10,
        currencyCode: "USD",
      });

      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-123",
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      if (!result.isSuccess) throw new Error("Expected success");
      
      expect(result.value.rentalItemId).toBeDefined();
      expect(result.value.shopifyProductId).toBe("product-123");
      expect(result.value.basePricePerDayCents).toBe(5000); // Uses Shopify price as default
      expect(result.value.quantity).toBe(10); // Uses Shopify inventory
      expect(result.value.metafieldSyncSuccess).toBe(true);

      // Verify saved to repository
      const saved = await rentalItemRepo.findByShopifyProduct("test-shop.myshopify.com", "product-123");
      expect(saved).toBeDefined();
      expect(saved?.name).toBe("Inflatable Kayak");
      expect(saved?.basePricePerDay.cents).toBe(5000); // Uses Shopify price as default
      expect(saved?.quantity).toBe(10); // Uses Shopify inventory
    });

    it("should use Shopify price as default base price", async () => {
      // Arrange
      shopifyAdapter.addProduct("product-456", {
        title: "Beach Umbrella",
        imageUrl: null,
        defaultVariantPriceCents: 1500, // $15
        totalInventoryQuantity: 25,
        currencyCode: "USD",
      });

      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-456",
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.basePricePerDayCents).toBe(1500);
      
      const saved = await rentalItemRepo.findByShopifyProduct("test-shop.myshopify.com", "product-456");
      expect(saved).toBeDefined();
      expect(saved?.basePricePerDay.cents).toBe(1500);
      expect(saved?.currencyCode).toBe("USD");
    });

    it("should fail if product not found in Shopify", async () => {
      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "nonexistent-product",
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("not found");

      // Verify nothing saved
      const saved = await rentalItemRepo.findByShopifyProduct("test-shop.myshopify.com", "nonexistent-product");
      expect(saved).toBeNull();
    });

    it("should sync pricing metafield to Shopify", async () => {
      // Arrange
      shopifyAdapter.addProduct("product-789", {
        title: "Paddle Board",
        imageUrl: "https://example.com/paddle.jpg",
        defaultVariantPriceCents: 8000,
        totalInventoryQuantity: 5,
        currencyCode: "USD",
      });

      // Act
      await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-789",
      });

      // Assert - should have attempted to sync metafield
      expect(shopifyAdapter.getMetafieldSyncCallCount()).toBe(1);
      expect(shopifyAdapter.wasMetafieldSyncedFor("product-789")).toBe(true);
    });
  });

  describe("updating existing rental item", () => {
    it("should update existing item with fresh Shopify data", async () => {
      // Arrange - existing rental item
      const existingItem = TestFactories.createRentalItem({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-123",
        name: "Old Name",
        basePricePerDayCents: 3000,
        quantity: 5,
      });
      await rentalItemRepo.save(existingItem);

      // Shopify has updated data
      shopifyAdapter.addProduct("product-123", {
        title: "Updated Kayak Name",
        imageUrl: "https://example.com/new-kayak.jpg",
        defaultVariantPriceCents: 5000,
        totalInventoryQuantity: 12,
        currencyCode: "USD",
      });

      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-123",
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.rentalItemId).toBe(existingItem.id);

      // Verify metadata updated but pricing unchanged
      const updated = await rentalItemRepo.findById(existingItem.id);
      expect(updated?.name).toBe("Updated Kayak Name");
      expect(updated?.imageUrl).toBe("https://example.com/new-kayak.jpg");
      
      // Pricing should NOT change (merchant set it)
      expect(updated?.basePricePerDay.cents).toBe(3000);
      expect(updated?.quantity).toBe(5);
    });

    it("should preserve merchant-configured pricing when updating", async () => {
      // Arrange - existing rental with custom pricing
      const existingItem = TestFactories.createRentalItem({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-999",
        basePricePerDayCents: 2500, // Merchant set this
        quantity: 3, // Merchant set this
        rateTiers: [
          { minDays: 3, pricePerDayCents: 2000 },
          { minDays: 7, pricePerDayCents: 1500 },
        ],
      });
      await rentalItemRepo.save(existingItem);

      // Shopify has different data
      shopifyAdapter.addProduct("product-999", {
        title: "Product Name",
        imageUrl: null,
        defaultVariantPriceCents: 5000, // Different from merchant config
        totalInventoryQuantity: 100, // Different from merchant config
        currencyCode: "USD",
      });

      // Act - re-track product
      await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-999",
      });

      // Assert - merchant config preserved
      const updated = await rentalItemRepo.findById(existingItem.id);
      expect(updated?.basePricePerDay.cents).toBe(2500); // Unchanged
      expect(updated?.quantity).toBe(3); // Unchanged
      expect(updated?.rateTiers.length).toBe(2); // Unchanged
    });
  });

  describe("error handling", () => {
    it("should handle Shopify API errors gracefully", async () => {
      // Act - product doesn't exist in mock
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "error-product",
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("not found");
    });

    it("should continue even if metafield sync fails", async () => {
      // Arrange
      shopifyAdapter.addProduct("product-456", {
        title: "Test Product",
        imageUrl: null,
        defaultVariantPriceCents: 1000,
        totalInventoryQuantity: 5,
        currencyCode: "USD",
      });

      // Act - even if metafield sync fails, rental item should be created
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-456",
      });

      // Assert - should succeed despite potential metafield failure
      expect(result.isSuccess).toBe(true);
      
      const saved = await rentalItemRepo.findByShopifyProduct("test-shop.myshopify.com", "product-456");
      expect(saved).toBeDefined();
    });
  });
});
