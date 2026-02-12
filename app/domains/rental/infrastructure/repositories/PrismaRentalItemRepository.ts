import type { PrismaClient } from "@prisma/client";
import { RentalItem } from "../../domain/entities/RentalItem";
import type { IRentalItemRepository } from "./IRentalItemRepository";
import { RentalItemMapper } from "./RentalItemMapper";

/**
 * Prisma implementation of rental item repository.
 */
export class PrismaRentalItemRepository implements IRentalItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<RentalItem | null> {
    const raw = await this.prisma.rentalItem.findUnique({
      where: { id },
      include: { rateTiers: true },
    });

    if (!raw) {
      return null;
    }

    const result = RentalItemMapper.toDomain(raw);
    return result.isSuccess ? result.value : null;
  }

  async findByShopifyProduct(shop: string, shopifyProductId: string): Promise<RentalItem | null> {
    const raw = await this.prisma.rentalItem.findUnique({
      where: {
        shop_shopifyProductId: {
          shop,
          shopifyProductId,
        },
      },
      include: { rateTiers: true },
    });

    if (!raw) {
      return null;
    }

    const result = RentalItemMapper.toDomain(raw);
    return result.isSuccess ? result.value : null;
  }

  async findByShop(shop: string): Promise<RentalItem[]> {
    const raw = await this.prisma.rentalItem.findMany({
      where: { shop },
      include: { rateTiers: true },
      orderBy: { createdAt: "desc" },
    });

    return RentalItemMapper.toDomainArray(raw);
  }

  async findByShopWithTierIds(shop: string): Promise<Array<{
    id: string;
    shopifyProductId: string;
    name: string | null;
    imageUrl: string | null;
    currencyCode: string;
    basePricePerDayCents: number;
    pricingAlgorithm: "FLAT" | "TIERED";
    quantity: number;
    rateTiers: Array<{ id: string; minDays: number; pricePerDayCents: number }>;
  }>> {
    const raw = await this.prisma.rentalItem.findMany({
      where: { shop },
      include: { rateTiers: { orderBy: { minDays: "asc" } } },
      orderBy: { createdAt: "desc" },
    });

    return raw.map((item) => ({
      id: item.id,
      shopifyProductId: item.shopifyProductId,
      name: item.name,
      imageUrl: item.imageUrl,
      currencyCode: item.currencyCode,
      basePricePerDayCents: item.basePricePerDayCents,
      pricingAlgorithm: item.pricingAlgorithm as "FLAT" | "TIERED",
      quantity: item.quantity,
      rateTiers: item.rateTiers.map((tier) => ({
        id: tier.id,
        minDays: tier.minDays,
        pricePerDayCents: tier.pricePerDayCents,
      })),
    }));
  }

  async save(rentalItem: RentalItem): Promise<void> {
    const data = RentalItemMapper.toPrisma(rentalItem);
    const rateTiers = RentalItemMapper.rateTiersToPrisma(rentalItem);

    await this.prisma.$transaction(async (tx) => {
      // Upsert rental item
      await tx.rentalItem.upsert({
        where: { id: rentalItem.id },
        create: data,
        update: data,
      });

      // Delete existing rate tiers
      await tx.rateTier.deleteMany({
        where: { rentalItemId: rentalItem.id },
      });

      // Create new rate tiers
      if (rateTiers.length > 0) {
        await tx.rateTier.createMany({
          data: rateTiers,
        });
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.rentalItem.delete({
      where: { id },
    });
  }
}
