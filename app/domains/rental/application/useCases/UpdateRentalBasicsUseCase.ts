import { Result } from "~/shared/kernel/Result";
import type { IRentalItemRepository } from "../../infrastructure/repositories/IRentalItemRepository";
import type { IShopifyProductAdapter } from "../../infrastructure/adapters/IShopifyProductAdapter";
import { UpdateRentalBasicsInput, UpdateRentalBasicsOutput } from "./dto/UpdateRentalBasicsDto";
import { Money } from "~/shared/kernel/Money";

/**
 * Use case: Update basic rental item properties.
 * 
 * Updates base price per day and quantity for an existing rental item.
 */
export class UpdateRentalBasicsUseCase {
  constructor(
    private rentalItemRepo: IRentalItemRepository,
    private shopifyAdapter: IShopifyProductAdapter
  ) {}

  async execute(input: UpdateRentalBasicsInput): Promise<Result<UpdateRentalBasicsOutput>> {
    // 1. Find rental item
    const rentalItem = await this.rentalItemRepo.findById(input.rentalItemId);
    if (!rentalItem) {
      return Result.fail("Rental item not found");
    }

    // Verify ownership
    if (rentalItem.shop !== input.shop) {
      return Result.fail("Rental item does not belong to this shop");
    }

    // 2. Update properties
    const basePriceResult = Money.fromCents(input.basePricePerDayCents, rentalItem.currencyCode);
    if (basePriceResult.isFailure) {
      return Result.fail(`Invalid price: ${basePriceResult.error}`);
    }
    
    const updateResult = rentalItem.updatePricing(
      basePriceResult.value,
      rentalItem.pricingAlgorithm,
      rentalItem.rateTiers,
      input.quantity
    );

    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    // 3. Save to database
    await this.rentalItemRepo.save(rentalItem);

    // 4. Sync pricing metafield (best effort)
    const metafieldResult = await this.shopifyAdapter.syncPricingMetafield(
      rentalItem.shopifyProductId,
      rentalItem.basePricePerDay.cents,
      rentalItem.rateTiers
    );

    // 5. Invalidate cache
    // TODO: Week 8 - Cache invalidation should be abstracted behind ICacheService interface
    // invalidateRentalCache(rentalItem.shop, rentalItem.shopifyProductId);

    // 6. Return result
    return Result.ok({
      rentalItemId: rentalItem.id,
      shopifyProductId: rentalItem.shopifyProductId,
      basePricePerDayCents: rentalItem.basePricePerDay.cents,
      quantity: rentalItem.quantity,
      metafieldSyncSuccess: metafieldResult.isSuccess,
      warning: metafieldResult.isFailure ? metafieldResult.error : undefined,
    });
  }
}
