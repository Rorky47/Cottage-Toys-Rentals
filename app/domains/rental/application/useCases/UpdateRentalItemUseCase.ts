import { Result } from "~/shared/kernel";
import type { IRentalItemRepository } from "../../infrastructure/repositories/IRentalItemRepository";
import type { UpdateRentalItemInput } from "../dto/UpdateRentalItemInput";
import type { RentalItemDto } from "../dto/RentalItemDto";
import { PricingAlgorithm } from "../../domain/entities/RentalItem";

/**
 * Use case for updating rental item configuration.
 * 
 * Business rules:
 * - Only update provided fields
 * - Validate pricing if updated
 * - Update quantity if provided
 */
export class UpdateRentalItemUseCase {
  constructor(private readonly rentalItemRepo: IRentalItemRepository) {}

  async execute(input: UpdateRentalItemInput): Promise<Result<RentalItemDto>> {
    // 1. Get existing rental item
    const rentalItem = await this.rentalItemRepo.findById(input.rentalItemId);
    if (!rentalItem) {
      return Result.fail("Rental item not found");
    }

    // 2. Update pricing if provided
    if (
      input.basePricePerDayCents !== undefined ||
      input.pricingAlgorithm !== undefined ||
      input.rateTiers !== undefined
    ) {
      const updateResult = rentalItem.updatePricing(
        input.basePricePerDayCents ?? rentalItem.basePricePerDay.cents,
        (input.pricingAlgorithm as PricingAlgorithm) ?? rentalItem.pricingAlgorithm,
        input.rateTiers
      );

      if (updateResult.isFailure) {
        return Result.fail(updateResult.error);
      }
    }

    // 3. Update quantity if provided
    if (input.quantity !== undefined) {
      const quantityResult = rentalItem.updateQuantity(input.quantity);
      if (quantityResult.isFailure) {
        return Result.fail(quantityResult.error);
      }
    }

    // 4. Save changes
    await this.rentalItemRepo.save(rentalItem);

    // 5. Return DTO
    return Result.ok({
      id: rentalItem.id,
      shop: rentalItem.shop,
      shopifyProductId: rentalItem.shopifyProductId,
      name: rentalItem.name,
      imageUrl: rentalItem.imageUrl,
      currencyCode: rentalItem.currencyCode,
      basePricePerDayCents: rentalItem.basePricePerDay.cents,
      pricingAlgorithm: rentalItem.pricingAlgorithm,
      quantity: rentalItem.quantity,
      rateTiers: rentalItem.rateTiers.map((tier) => ({
        minDays: tier.minDays,
        pricePerDayCents: tier.pricePerDay.cents,
      })),
    });
  }
}
