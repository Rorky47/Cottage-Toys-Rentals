import type { PrismaClient } from "@prisma/client";
import type { IShopSettingsRepository } from "../repositories/IShopSettingsRepository";
import { ShopSettings } from "~/domains/shop/domain/ShopSettings";
import { Result } from "~/shared/Result";

/**
 * Prisma implementation of ShopSettings repository
 */
export class PrismaShopSettingsRepository implements IShopSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByShop(shop: string): Promise<Result<ShopSettings | null>> {
    try {
      const record = await this.prisma.shopSettings.findUnique({
        where: { shop },
      });

      if (!record) {
        return Result.ok(null);
      }

      const settings = new ShopSettings(
        record.shop,
        record.privacyAcceptedAt,
        record.privacyAcceptedVersion,
      );

      return Result.ok(settings);
    } catch (error) {
      return Result.fail(`Failed to find shop settings: ${error}`);
    }
  }

  async save(settings: ShopSettings): Promise<Result<ShopSettings>> {
    try {
      const record = await this.prisma.shopSettings.upsert({
        where: { shop: settings.shop },
        create: {
          shop: settings.shop,
          privacyAcceptedAt: settings.privacyAcceptedAt,
          privacyAcceptedVersion: settings.privacyAcceptedVersion,
        },
        update: {
          privacyAcceptedAt: settings.privacyAcceptedAt,
          privacyAcceptedVersion: settings.privacyAcceptedVersion,
        },
      });

      const saved = new ShopSettings(
        record.shop,
        record.privacyAcceptedAt,
        record.privacyAcceptedVersion,
      );

      return Result.ok(saved);
    } catch (error) {
      return Result.fail(`Failed to save shop settings: ${error}`);
    }
  }
}
