import type { RentalItem as PrismaRentalItem, RateTier as PrismaRateTier } from "@prisma/client";
import { RentalItem, PricingAlgorithm } from "../../domain/entities/RentalItem";
import { Result, Money } from "~/shared/kernel";

type PrismaRentalItemWithTiers = PrismaRentalItem & {
  rateTiers: PrismaRateTier[];
};

/**
 * Maps between Prisma rental item records and domain RentalItem entities.
 */
export class RentalItemMapper {
  /**
   * Convert Prisma rental item to domain entity.
   */
  static toDomain(raw: PrismaRentalItemWithTiers): Result<RentalItem> {
    const basePriceResult = Money.fromCents(raw.basePricePerDayCents, raw.currencyCode);
    if (basePriceResult.isFailure) {
      return Result.fail(basePriceResult.error);
    }
    
    return RentalItem.create({
      id: raw.id,
      shop: raw.shop,
      shopifyProductId: raw.shopifyProductId,
      name: raw.name,
      imageUrl: raw.imageUrl,
      currencyCode: raw.currencyCode,
      basePricePerDay: basePriceResult.value,
      pricingAlgorithm: raw.pricingAlgorithm as PricingAlgorithm,
      quantity: raw.quantity,
      rateTiers: raw.rateTiers.map((tier) => ({
        minDays: tier.minDays,
        pricePerDayCents: tier.pricePerDayCents,
      })),
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma record format (without rate tiers).
   */
  static toPrisma(
    rentalItem: RentalItem
  ): Omit<PrismaRentalItem, "createdAt" | "updatedAt"> {
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
    };
  }

  /**
   * Convert rate tiers to Prisma format.
   */
  static rateTiersToPrisma(rentalItem: RentalItem): Array<{
    rentalItemId: string;
    minDays: number;
    pricePerDayCents: number;
  }> {
    return rentalItem.rateTiers.map((tier) => ({
      rentalItemId: rentalItem.id,
      minDays: tier.minDays,
      pricePerDayCents: tier.pricePerDay.cents,
    }));
  }

  /**
   * Map array of Prisma rental items to domain entities.
   */
  static toDomainArray(raw: PrismaRentalItemWithTiers[]): RentalItem[] {
    return raw
      .map((r) => this.toDomain(r))
      .filter((result) => result.isSuccess)
      .map((result) => result.value);
  }
}
