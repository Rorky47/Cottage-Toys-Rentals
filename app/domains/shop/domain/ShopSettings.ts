/**
 * Domain Entity: ShopSettings
 * 
 * Represents per-shop configuration and compliance tracking.
 */
export class ShopSettings {
  constructor(
    public readonly shop: string,
    public readonly privacyAcceptedAt: Date | null,
    public readonly privacyAcceptedVersion: string | null,
  ) {}

  /**
   * Business rule: Check if merchant has accepted privacy policy
   */
  hasAcceptedPrivacy(): boolean {
    return this.privacyAcceptedAt !== null;
  }

  /**
   * Factory: Create new shop settings with privacy accepted
   */
  static createWithPrivacyAccepted(shop: string, version: string): ShopSettings {
    return new ShopSettings(
      shop,
      new Date(),
      version,
    );
  }
}
