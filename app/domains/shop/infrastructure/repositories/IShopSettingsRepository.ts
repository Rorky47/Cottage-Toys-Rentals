import type { ShopSettings } from "~/domains/shop/domain/ShopSettings";
import type { Result } from "~/shared/kernel/Result";

/**
 * Repository Interface: ShopSettings
 * 
 * Data access abstraction for shop configuration.
 */
export interface IShopSettingsRepository {
  /**
   * Find shop settings by shop domain
   */
  findByShop(shop: string): Promise<Result<ShopSettings | null>>;

  /**
   * Save (create or update) shop settings
   */
  save(settings: ShopSettings): Promise<Result<ShopSettings>>;
}
