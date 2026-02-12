import { describe, it, expect, beforeEach } from "vitest";
import { DeleteRentalItemUseCase } from "../DeleteRentalItemUseCase";
import { MockRentalItemRepository } from "../../../../../shared/testing/mocks/MockRentalItemRepository";
import { TestFactories } from "../../../../../shared/testing/factories";

describe("DeleteRentalItemUseCase", () => {
  let useCase: DeleteRentalItemUseCase;
  let rentalItemRepo: MockRentalItemRepository;

  beforeEach(() => {
    rentalItemRepo = new MockRentalItemRepository();
    useCase = new DeleteRentalItemUseCase(rentalItemRepo);
  });

  describe("deleting rental item", () => {
    it("should delete rental item by shopify product ID", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-123",
      });
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "product-123",
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.deleted).toBe(true);
      expect(result.value.shopifyProductId).toBe("product-123");

      // Verify deleted from repository
      const found = await rentalItemRepo.findByShopifyProduct(
        "test-shop.myshopify.com",
        "product-123"
      );
      expect(found).toBeNull();
    });

    it("should only delete rental config, not Shopify product", async () => {
      // This is a behavioral test - the use case should not call Shopify to delete the product
      // It only removes our rental tracking

      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        shopifyProductId: "product-456",
      });
      await rentalItemRepo.save(rentalItem);

      const countBefore = rentalItemRepo.count();

      // Act
      await useCase.execute({
        shop: rentalItem.shop,
        shopifyProductId: "product-456",
      });

      // Assert
      const countAfter = rentalItemRepo.count();
      expect(countAfter).toBe(countBefore - 1);
    });

    it("should handle deleting item with multiple in database", async () => {
      // Arrange - create 3 items
      const item1 = TestFactories.createRentalItem({ shopifyProductId: "product-1" });
      const item2 = TestFactories.createRentalItem({ shopifyProductId: "product-2" });
      const item3 = TestFactories.createRentalItem({ shopifyProductId: "product-3" });
      
      await rentalItemRepo.save(item1);
      await rentalItemRepo.save(item2);
      await rentalItemRepo.save(item3);

      // Act - delete item2
      const result = await useCase.execute({
        shop: item2.shop,
        shopifyProductId: "product-2",
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(rentalItemRepo.count()).toBe(2);

      // Verify correct item deleted
      expect(await rentalItemRepo.findById(item1.id)).not.toBeNull();
      expect(await rentalItemRepo.findById(item2.id)).toBeNull();
      expect(await rentalItemRepo.findById(item3.id)).not.toBeNull();
    });
  });

  describe("validation", () => {
    it("should fail if rental item not found", async () => {
      // Act
      const result = await useCase.execute({
        shop: "test-shop.myshopify.com",
        shopifyProductId: "nonexistent-product",
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("not found");
    });

    it("should fail if shop does not match", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        shop: "shop-a.myshopify.com",
        shopifyProductId: "product-789",
      });
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        shop: "shop-b.myshopify.com", // Different shop!
        shopifyProductId: "product-789",
      });

      // Assert
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain("not found"); // Can't find because shop doesn't match
    });
  });
});
