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
