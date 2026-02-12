import { Result } from "~/shared/kernel";
import { RentalItem, PricingAlgorithm } from "../../domain/entities/RentalItem";
import type { IRentalItemRepository } from "../../infrastructure/repositories/IRentalItemRepository";
import type { RentalItemDto } from "../dto/RentalItemDto";
import { randomBytes } from "crypto";

interface UpsertRentalItemInput {
  shop: string;
  shopifyProductId: string;
  name: string | null;
  imageUrl?: string | null;
  currencyCode: string;
  basePricePerDayCents: number;
  pricingAlgorithm?: PricingAlgorithm;
  quantity?: number;
}

/**
 * Use case for upserting a rental item (create or update).
 * Used by webhooks when we need to auto-track products that weren't manually configured.
 * 
 * Business rules:
 * - If product not tracked, create with minimal config
 * - If product already tracked, update pricing and metadata only
 */
export class UpsertRentalItemUseCase {
  constructor(private readonly rentalItemRepo: IRentalItemRepository) {}

  async execute(input: UpsertRentalItemInput): Promise<Result<RentalItemDto>> {
    // 1. Check if already exists
    const existing = await this.rentalItemRepo.findByShopifyProduct(
      input.shop,
      input.shopifyProductId
    );

    if (existing) {
      // Update existing item
      existing.updateBasics({
        name: input.name || existing.name,
        imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl,
        currencyCode: input.currencyCode,
        basePricePerDayCents: input.basePricePerDayCents,
      });

      await this.rentalItemRepo.save(existing);
      return Result.ok(this.toDto(existing));
    }

    // 2. Create new rental item
    const rentalItemResult = RentalItem.create({
      id: this.generateId(),
      shop: input.shop,
      shopifyProductId: input.shopifyProductId,
      name: input.name || "Untitled Product",
      imageUrl: input.imageUrl || null,
      currencyCode: input.currencyCode,
      basePricePerDayCents: input.basePricePerDayCents,
      pricingAlgorithm: input.pricingAlgorithm || PricingAlgorithm.FLAT,
      quantity: input.quantity || 1,
      rateTiers: [],
    });

    if (rentalItemResult.isFailure) {
      return Result.fail(rentalItemResult.error);
    }

    const rentalItem = rentalItemResult.value;

    // 3. Save to database
    await this.rentalItemRepo.save(rentalItem);

    // 4. Return DTO
    return Result.ok(this.toDto(rentalItem));
  }

  private generateId(): string {
    return randomBytes(16).toString("hex");
  }

  private toDto(rentalItem: RentalItem): RentalItemDto {
    return {
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
    };
  }
}
