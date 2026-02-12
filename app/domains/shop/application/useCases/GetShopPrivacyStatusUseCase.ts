import type { Result } from "~/shared/kernel/Result";
import type { IShopSettingsRepository } from "~/domains/shop/infrastructure/repositories/IShopSettingsRepository";

/**
 * Use Case: Get Shop Privacy Status
 * 
 * Checks if a merchant has accepted the privacy policy.
 * Used for conditional rendering in admin UI.
 * 
 * @domain Shop
 * @subdomain Compliance
 */
export class GetShopPrivacyStatusUseCase {
  constructor(
    private readonly shopSettingsRepository: IShopSettingsRepository,
  ) {}

  async execute(shop: string): Promise<Result<boolean>> {
    const result = await this.shopSettingsRepository.findByShop(shop);

    if (result.isFailure) {
      // Fail-safe: if we can't check, assume not accepted
      return Result.ok(false);
    }

    const settings = result.value;
    const hasAccepted = settings ? settings.hasAcceptedPrivacy() : false;

    return Result.ok(hasAccepted);
  }
}
