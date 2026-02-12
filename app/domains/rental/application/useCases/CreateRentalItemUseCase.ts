import { Result } from "~/shared/kernel";
import { RentalItem, PricingAlgorithm } from "../../domain/entities/RentalItem";
import type { IRentalItemRepository } from "../../infrastructure/repositories/IRentalItemRepository";
import type { CreateRentalItemInput } from "../dto/CreateRentalItemInput";
import type { RentalItemDto } from "../dto/RentalItemDto";
import { randomBytes } from "crypto";

/**
 * Use case for creating a new rental item.
 * 
 * Business rules:
 * - Check if product already configured for rental
 * - Validate pricing configuration
 * - Create rental item entity
 */
export class CreateRentalItemUseCase {
  constructor(private readonly rentalItemRepo: IRentalItemRepository) {}

  async execute(input: CreateRentalItemInput): Promise<Result<RentalItemDto>> {
    // 1. Check if already exists
    const existing = await this.rentalItemRepo.findByShopifyProductId(
      input.shop,
      input.shopifyProductId
    );

    if (existing) {
      return Result.fail("Rental item already exists for this product");
    }

    // 2. Create rental item entity
    const rentalItemResult = RentalItem.create({
      id: this.generateId(),
      shop: input.shop,
      shopifyProductId: input.shopifyProductId,
      name: input.name,
      imageUrl: input.imageUrl || null,
      currencyCode: input.currencyCode,
      basePricePerDayCents: input.basePricePerDayCents,
      pricingAlgorithm: input.pricingAlgorithm as PricingAlgorithm,
      quantity: input.quantity,
      rateTiers: input.rateTiers,
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
