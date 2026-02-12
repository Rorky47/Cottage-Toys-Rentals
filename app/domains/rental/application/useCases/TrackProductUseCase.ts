import { Result } from "~/shared/kernel/Result";
import type { IRentalItemRepository } from "../../infrastructure/repositories/IRentalItemRepository";
import type { IShopifyProductAdapter } from "../../infrastructure/adapters/IShopifyProductAdapter";
import { TrackProductInput, TrackProductOutput } from "./dto/TrackProductDto";
import { RentalItem } from "../../domain/entities/RentalItem";
import { Money } from "~/shared/kernel/Money";
// import { invalidateRentalCache } from "~/rental"; // TODO: Week 8 - Abstract cache behind ICacheService interface

/**
 * Use case: Track a Shopify product as a rental item.
 * 
 * Creates or updates a rental configuration for a Shopify product.
 * Fetches product details (title, image, price, inventory) from Shopify
 * and creates rental item with sensible defaults.
 * 
 * Flow:
 * 1. Fetch product info from Shopify (validates product exists)
 * 2. Create/update rental item with defaults from Shopify
 * 3. Sync pricing metafield to Shopify (best effort)
 * 4. Invalidate cache
 */
export class TrackProductUseCase {
  constructor(
    private rentalItemRepo: IRentalItemRepository,
    private shopifyAdapter: IShopifyProductAdapter
  ) {}

  async execute(input: TrackProductInput): Promise<Result<TrackProductOutput>> {
    // 1. Fetch product info from Shopify
    const productInfoResult = await this.shopifyAdapter.getProductInfo(input.shopifyProductId);
    if (productInfoResult.isFailure) {
      return Result.fail(productInfoResult.error);
    }

    const productInfo = productInfoResult.value;

    // 2. Check if rental item already exists
    const existingItem = await this.rentalItemRepo.findByShopifyProduct(
      input.shop,
      input.shopifyProductId
    );

    let rentalItem: RentalItem;

    if (existingItem) {
      // Update existing item with fresh Shopify data
      existingItem.updateMetadata(
        productInfo.title,
        productInfo.imageUrl,
        productInfo.currencyCode
      );
      rentalItem = existingItem;
    } else {
      // Create new rental item with defaults from Shopify
      const basePriceResult = Money.fromCents(productInfo.defaultVariantPriceCents, productInfo.currencyCode);
      if (basePriceResult.isFailure) {
        return Result.fail(`Invalid price from Shopify: ${basePriceResult.error}`);
      }
      
      const createResult = RentalItem.create({
        shop: input.shop,
        shopifyProductId: input.shopifyProductId,
        name: productInfo.title,
        imageUrl: productInfo.imageUrl,
        currencyCode: productInfo.currencyCode,
        basePricePerDay: basePriceResult.value,
        pricingAlgorithm: "FLAT",
        quantity: productInfo.totalInventoryQuantity,
        rateTiers: [],
      });

      if (createResult.isFailure) {
        return Result.fail(createResult.error);
      }

      rentalItem = createResult.value;
    }

    // 3. Save to database
    await this.rentalItemRepo.save(rentalItem);

    // 4. Sync pricing metafield (best effort)
    const metafieldResult = await this.shopifyAdapter.syncPricingMetafield(
      input.shopifyProductId,
      rentalItem.basePricePerDay.cents,
      rentalItem.rateTiers
    );

    // 5. Invalidate cache
    // TODO: Week 8 - Cache invalidation should be abstracted behind ICacheService interface
    // invalidateRentalCache(input.shop, input.shopifyProductId);

    // 6. Return result
    return Result.ok({
      rentalItemId: rentalItem.id,
      shopifyProductId: input.shopifyProductId,
      basePricePerDayCents: rentalItem.basePricePerDay.cents,
      quantity: rentalItem.quantity,
      metafieldSyncSuccess: metafieldResult.isSuccess,
      warning: metafieldResult.isFailure ? metafieldResult.error : undefined,
    });
  }
}
