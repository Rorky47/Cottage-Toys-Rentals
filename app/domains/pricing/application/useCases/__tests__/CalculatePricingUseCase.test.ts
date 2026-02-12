import { describe, it, expect, beforeEach } from "vitest";
import { CalculatePricingUseCase } from "../CalculatePricingUseCase";
import { MockRentalItemRepository } from "../../../../../shared/testing/mocks/MockRentalItemRepository";
import { TestFactories } from "../../../../../shared/testing/factories";
import { PricingAlgorithm } from "../../../../rental/domain/entities/RentalItem";

describe("CalculatePricingUseCase", () => {
  let rentalItemRepo: MockRentalItemRepository;
  let useCase: CalculatePricingUseCase;

  beforeEach(() => {
    rentalItemRepo = new MockRentalItemRepository();
    useCase = new CalculatePricingUseCase(rentalItemRepo);
  });

  describe("FLAT pricing", () => {
    it("should calculate price using base price for any duration", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        id: "item-1",
        basePricePerDayCents: 1000, // $10/day
        pricingAlgorithm: PricingAlgorithm.FLAT,
      });
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        rentalItemId: "item-1",
        durationDays: 5,
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.pricePerDayCents).toBe(1000);
      expect(result.value.totalCents).toBe(5000); // $10 * 5 days = $50
      expect(result.value.algorithm).toBe("FLAT");
      expect(result.value.appliedTier).toBeUndefined();
    });

    it("should work for 1 day rental", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        id: "item-1",
        basePricePerDayCents: 2500, // $25/day
        pricingAlgorithm: PricingAlgorithm.FLAT,
      });
      await rentalItemRepo.save(rentalItem);

      // Act
      const result = await useCase.execute({
        rentalItemId: "item-1",
        durationDays: 1,
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.totalCents).toBe(2500);
    });
  });

  describe("TIERED pricing", () => {
    it("should use base price when no tiers apply", async () => {
      // Arrange - tiers start at 3 days
      const rentalItem = TestFactories.createRentalItem({
        id: "item-1",
        basePricePerDayCents: 1000, // $10/day
        pricingAlgorithm: PricingAlgorithm.TIERED,
        rateTiers: [
          { minDays: 3, pricePerDayCents: 800 }, // $8/day for 3+ days
          { minDays: 7, pricePerDayCents: 600 }, // $6/day for 7+ days
        ],
      });
      await rentalItemRepo.save(rentalItem);

      // Act - 2 day rental (no tier applies)
      const result = await useCase.execute({
        rentalItemId: "item-1",
        durationDays: 2,
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.pricePerDayCents).toBe(1000); // Base price
      expect(result.value.totalCents).toBe(2000);
      expect(result.value.appliedTier).toBeUndefined();
    });

    it("should apply tier 1 when duration qualifies", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        id: "item-1",
        basePricePerDayCents: 1000,
        pricingAlgorithm: PricingAlgorithm.TIERED,
        rateTiers: [
          { minDays: 3, pricePerDayCents: 800 },
          { minDays: 7, pricePerDayCents: 600 },
        ],
      });
      await rentalItemRepo.save(rentalItem);

      // Act - 5 day rental (tier 1 applies)
      const result = await useCase.execute({
        rentalItemId: "item-1",
        durationDays: 5,
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.pricePerDayCents).toBe(800);
      expect(result.value.totalCents).toBe(4000); // $8 * 5 days = $40
      expect(result.value.appliedTier).toEqual({
        minDays: 3,
        pricePerDayCents: 800,
      });
    });

    it("should apply highest qualifying tier", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        id: "item-1",
        basePricePerDayCents: 1000,
        pricingAlgorithm: PricingAlgorithm.TIERED,
        rateTiers: [
          { minDays: 3, pricePerDayCents: 800 },
          { minDays: 7, pricePerDayCents: 600 },
          { minDays: 14, pricePerDayCents: 500 },
        ],
      });
      await rentalItemRepo.save(rentalItem);

      // Act - 10 day rental (tier 2 applies, tier 3 doesn't)
      const result = await useCase.execute({
        rentalItemId: "item-1",
        durationDays: 10,
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.pricePerDayCents).toBe(600);
      expect(result.value.totalCents).toBe(6000); // $6 * 10 days = $60
      expect(result.value.appliedTier).toEqual({
        minDays: 7,
        pricePerDayCents: 600,
      });
    });

    it("should apply top tier for long rentals", async () => {
      // Arrange
      const rentalItem = TestFactories.createRentalItem({
        id: "item-1",
        basePricePerDayCents: 1000,
        pricingAlgorithm: PricingAlgorithm.TIERED,
        rateTiers: [
          { minDays: 3, pricePerDayCents: 800 },
          { minDays: 7, pricePerDayCents: 600 },
          { minDays: 14, pricePerDayCents: 500 },
        ],
      });
      await rentalItemRepo.save(rentalItem);

      // Act - 30 day rental (top tier applies)
      const result = await useCase.execute({
        rentalItemId: "item-1",
        durationDays: 30,
      });

      // Assert
      expect(result.isSuccess).toBe(true);
      expect(result.value.pricePerDayCents).toBe(500);
      expect(result.value.totalCents).toBe(15000); // $5 * 30 days = $150
      expect(result.value.appliedTier?.minDays).toBe(14);
    });
  });

  it("should fail when rental item not found", async () => {
    // Act
    const result = await useCase.execute({
      rentalItemId: "non-existent",
      durationDays: 5,
    });

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("Rental item not found");
  });

  it("should include currency code in response", async () => {
    // Arrange
    const rentalItem = TestFactories.createRentalItem({
      id: "item-1",
      currencyCode: "CAD",
      basePricePerDayCents: 1200,
    });
    await rentalItemRepo.save(rentalItem);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
      durationDays: 3,
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.currencyCode).toBe("CAD");
  });
});
