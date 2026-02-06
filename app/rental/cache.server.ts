/**
 * In-memory cache for rental item + rate tiers (quote path).
 * TTL 1 hour. For multi-instance deployment, replace with Redis.
 */

const TIER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type CacheEntry<T> = { value: T; expiresAt: number };

const rentalItemCache = new Map<string, CacheEntry<CachedRentalItem>>();

export type CachedRentalItem = {
  id: string;
  shop: string;
  shopifyProductId: string;
  name: string | null;
  basePricePerDayCents: number;
  quantity: number;
  rateTiers: Array<{ minDays: number; pricePerDayCents: number }>;
};

function cacheKey(shop: string, productId: string): string {
  return `rental:${shop}:${productId}`;
}

export function getCachedRentalItem(
  shop: string,
  productId: string
): CachedRentalItem | null {
  const key = cacheKey(shop, productId);
  const entry = rentalItemCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    rentalItemCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedRentalItem(
  shop: string,
  productId: string,
  item: CachedRentalItem
): void {
  const key = cacheKey(shop, productId);
  rentalItemCache.set(key, {
    value: item,
    expiresAt: Date.now() + TIER_CACHE_TTL_MS,
  });
}

export function invalidateRentalCache(shop: string, productId: string): void {
  rentalItemCache.delete(cacheKey(shop, productId));
}
