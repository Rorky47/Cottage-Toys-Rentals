import { Result } from "~/shared/kernel/Result";
import type { IShopSettingsRepository } from "~/domains/shop/infrastructure/repositories/IShopSettingsRepository";
import type { AcceptPrivacyPolicyDto } from "../dto/AcceptPrivacyPolicyDto";
import { ShopSettings } from "~/domains/shop/domain/ShopSettings";

/**
 * Use Case: Accept Privacy Policy
 * 
 * Records merchant's acceptance of the app's privacy policy.
 * Required for GDPR compliance and Shopify App Store requirements.
 * 
 * @domain Shop
 * @subdomain Compliance
 */
export class AcceptPrivacyPolicyUseCase {
  constructor(
    private readonly shopSettingsRepository: IShopSettingsRepository,
  ) {}

  async execute(input: AcceptPrivacyPolicyDto): Promise<Result<void>> {
    // Create settings with privacy accepted
    const settings = ShopSettings.createWithPrivacyAccepted(
      input.shop,
      input.version,
    );

    // Save to database
    const saveResult = await this.shopSettingsRepository.save(settings);

    if (saveResult.isFailure) {
      return saveResult.asVoid();
    }

    return Result.ok(undefined);
  }
}
