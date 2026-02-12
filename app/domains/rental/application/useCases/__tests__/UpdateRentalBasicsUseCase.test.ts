import { describe, it, expect, beforeEach } from "vitest";
import { UpdateRentalBasicsUseCase } from "../UpdateRentalBasicsUseCase";
import { MockRentalItemRepository } from "../../../../../shared/testing/mocks/MockRentalItemRepository";
import { MockShopifyProductAdapter } from "../../../../../shared/testing/mocks/MockShopifyProductAdapter";
import { TestFactories } from "../../../../../shared/testing/factories";

describe("UpdateRentalBasicsUseCase", () => {
  let useCase: UpdateRentalBasicsUseCase;
  let rentalItemRepo: MockRentalItemRepository;
  let shopifyAdapter: MockShopifyProductAdapter;

  beforeEach(() => {
    rentalItemRepo = new MockRentalItemRepository();
    shopifyAdapter = new MockShopifyProductAdapter();
    useCase = new UpdateRentalBasicsUseCase(rentalItemRepo, shopifyAdapter);
  });

  describe("updating rental item", () => {
    it("should update base price and quantity", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-123",
        basePricePerDayCents: 5000,
        quantity: 10,
      });
      await rentalItemRepo.save(rentalItem);
      
      // Add product to Shopify mock
      shopifyAdapter.addProduct("product-123", {
        title: "Test Product",
        imageUrl: null,
        defaultVariantPriceCents: 5000,
        totalInventoryQuantity: 10,
        currencyCode: "USD",
      });

      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        rentalItemId: rentalItem.id,
        basePricePerDayCents: 7500, // Update to $75
        quantity: 15, // Update to 15 units
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.basePricePerDayCents).toBe(7500);
      expect(result.value.quantity).toBe(15);
      expect(result.value.metafieldSyncSuccess).toBe(true);

      // Verify saved
      const updated = await rentalItemRepo.findById(rentalItem.id);
      expect(updated?.basePricePerDay.cents).toBe(7500);
      expect(updated?.quantity).toBe(15);
    });

    it("should sync pricing metafield after update", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        shopifyProductId: "product-456",
        basePricePerDayCents: 2000,
      });
      await rentalItemRepo.save(rentalItem);

      // Act
      await useCase.execute({
        shop: rentalItem.shop,
        rentalItemId: rentalItem.id,
        basePricePerDayCents: 3000,
        quantity: rentalItem.quantity,
      });

      // Assert
      expect(shopifyAdapter.wasMetafieldSyncedFor("product-456")).toBe(true);
      const syncCalls = shopifyAdapter.getMetafieldSyncCalls();
      expect(syncCalls[0].basePriceCents).toBe(3000);
    });

    it("should allow updating quantity without changing price", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        basePricePerDayCents: 5000,
        quantity: 10,
      });
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        shop: rentalItem.shop,
        rentalItemId: rentalItem.id,
        basePricePerDayCents: 5000, // Keep same price
        quantity: 20, // Only update quantity
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.basePricePerDayCents).toBe(5000);
      expect(result.value.quantity).toBe(20);
    });

    it("should continue even if metafield sync fails", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem();
      await rentalItemRepo.save(rentalItem);

      shopifyAdapter.setShouldFailMetafieldSync(true);

      // Act
      const result = await useCase.execute({
        shop: rentalItem.shop,
        rentalItemId: rentalItem.id,
        basePricePerDayCents: 6000,
        quantity: 12,
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.metafieldSyncSuccess).toBe(false);
      expect(result.value.warning).toContain("Failed to sync");

      // Verify item was still saved
      const updated = await rentalItemRepo.findById(rentalItem.id);
      expect(updated?.basePricePerDay.cents).toBe(6000);
    });
  });

  describe("validation", () => {
    it("should fail if rental item not found", async () => {
      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        rentalItemId: "nonexistent-id",
        basePricePerDayCents: 5000,
        quantity: 10,
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("not found");
    });

    it("should fail if shop does not match", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        shop: "shop-a.myshopify.com",
      });
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        shop: "shop-b.myshopify.com", // Different shop!
        rentalItemId: rentalItem.id,
        basePricePerDayCents: 5000,
        quantity: 10,
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("does not belong");
    });

    it("should fail if price is negative", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem();
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        shop: rentalItem.shop,
        rentalItemId: rentalItem.id,
        basePricePerDayCents: -1000, // Negative price
        quantity: 10,
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Invalid price");
    });

    it("should fail if quantity is negative", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem();
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        shop: rentalItem.shop,
        rentalItemId: rentalItem.id,
        basePricePerDayCents: 5000,
        quantity: -5, // Negative quantity
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("Quantity cannot be negative");
    });
  });
});
