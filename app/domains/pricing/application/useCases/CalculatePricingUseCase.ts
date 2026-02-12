import { Result, Money } from "~/shared/kernel";
import type { IRentalItemRepository } from "~/domains/rental/infrastructure/repositories/IRentalItemRepository";
import type { CalculatePricingInput } from "../dto/CalculatePricingInput";
import type { PricingDto } from "../dto/PricingDto";
import { PricingAlgorithm } from "~/domains/rental/domain/entities/RentalItem";

/**
 * Use case for calculating rental pricing.
 * 
 * Business rules:
 * - FLAT: Use base price for all durations
 * - TIERED: Find applicable tier based on duration, use that price
 * - Total = pricePerDay * durationDays
 */
export class CalculatePricingUseCase {
  constructor(private readonly rentalItemRepo: IRentalItemRepository) {}

  async execute(input: CalculatePricingInput): Promise<Result<PricingDto>> {
    // 1. Get rental item
    const rentalItem = await this.rentalItemRepo.findById(input.rentalItemId);
    if (!rentalItem) {
      return Result.fail("Rental item not found");
    }

    // 2. Determine price per day based on algorithm
    let pricePerDay: Money;
    let appliedTier: { minDays: number; pricePerDayCents: number } | undefined;

    if (rentalItem.pricingAlgorithm === PricingAlgorithm.FLAT) {
      pricePerDay = rentalItem.basePricePerDay;
    } else {
      // TIERED: Find the highest tier that applies
      const applicableTiers = rentalItem.rateTiers.filter(
        (tier) => tier.minDays <= input.durationDays
      );

      if (applicableTiers.length === 0) {
        // No tier applies, use base price
        pricePerDay = rentalItem.basePricePerDay;
      } else {
        // Use the tier with the highest minDays (most specific)
        const bestTier = applicableTiers[applicableTiers.length - 1];
        pricePerDay = bestTier.pricePerDay;
        appliedTier = {
          minDays: bestTier.minDays,
          pricePerDayCents: bestTier.pricePerDay.cents,
        };
      }
    }

    // 3. Calculate total
    const totalResult = pricePerDay.multiply(input.durationDays);
    if (totalResult.isFailure) {
      return Result.fail(totalResult.error);
    }

    // 4. Return DTO
    return Result.ok({
      rentalItemId: rentalItem.id,
      durationDays: input.durationDays,
      pricePerDayCents: pricePerDay.cents,
      totalCents: totalResult.value.cents,
      currencyCode: rentalItem.currencyCode,
      algorithm: rentalItem.pricingAlgorithm,
      appliedTier,
    });
  }
}
