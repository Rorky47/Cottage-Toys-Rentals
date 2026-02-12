import { Result } from "~/shared/kernel/Result";
import type { IRentalItemRepository } from "../../infrastructure/repositories/IRentalItemRepository";
import type { IShopifyProductAdapter } from "../../infrastructure/adapters/IShopifyProductAdapter";
import { DeleteRentalItemInput, DeleteRentalItemOutput } from "./dto/DeleteRentalItemDto";
// import { invalidateRentalCache } from "~/rental"; // TODO: Week 8 - Abstract cache behind ICacheService interface

/**
 * Use case: Delete a rental item configuration.
 * 
 * Removes the rental configuration for a Shopify product.
 * Does NOT delete the product from Shopify - only removes rental tracking.
 * 
 * Cleanup:
 * - Deletes rental item from database
 * - Deletes rate tiers (Prisma cascade)
 * - Removes pricing metafield from Shopify product
 * - Bookings are NOT deleted (orphaned bookings remain for audit trail)
 * 
 * Flow:
 * 1. Find rental item
 * 2. Delete metafield from Shopify
 * 3. Delete from database
 * 4. Invalidate cache
 */
export class DeleteRentalItemUseCase {
  constructor(
    private rentalItemRepo: IRentalItemRepository,
    private shopifyAdapter: IShopifyProductAdapter
  ) {}

  async execute(input: DeleteRentalItemInput): Promise<Result<DeleteRentalItemOutput>> {
    // 1. Find rental item to verify it exists
    const rentalItem = await this.rentalItemRepo.findByShopifyProduct(
      input.shop,
      input.shopifyProductId
    );

    if (!rentalItem) {
      return Result.fail("Rental item not found");
    }

    // 2. Delete metafield from Shopify (best effort - don't fail if this errors)
    try {
      await this.shopifyAdapter.deleteRentalPricingMetafield(input.shopifyProductId);
    } catch (error) {
      console.warn(`[DeleteRentalItem] Failed to delete metafield for product ${input.shopifyProductId}:`, error);
      // Continue with deletion even if metafield removal fails
    }

    // 3. Delete from database
    await this.rentalItemRepo.delete(rentalItem.id);

    // 4. Invalidate cache
    // TODO: Week 8 - Cache invalidation should be abstracted behind ICacheService interface
    // invalidateRentalCache(input.shop, input.shopifyProductId);

    // 5. Return result
    return Result.ok({
      deleted: true,
      shopifyProductId: input.shopifyProductId,
    });
  }
}
