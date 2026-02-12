/**
 * @deprecated This file will be migrated to an adapter pattern in Week 8.
 * 
 * **Future replacement**: `ShopifyMetafieldAdapter` (to be created)
 * 
 * **Migration planned for**: Week 8 (Infrastructure Abstractions)
 * 
 * **Why keep for now**: 
 * - Still functional and needed
 * - Will be refactored with proper adapter pattern
 * - Low priority (infrastructure concern)
 * 
 * **Status**: KEEP UNTIL WEEK 8
 */

export type RentalPricingTier = { minDays: number; pricePerDayCents: number };

/**
 * @deprecated Will be replaced with ShopifyMetafieldAdapter
 */
export async function syncRentalPricingMetafieldForProduct(opts: {
  admin: any;
  shopifyProductId: string;
  basePricePerDayCents: number;
  tiers: RentalPricingTier[];
}) {
  const { admin, shopifyProductId, basePricePerDayCents, tiers } = opts;

  const productGid = `gid://shopify/Product/${shopifyProductId}`;
  const value = JSON.stringify({
    basePricePerDayCents,
    tiers: [...tiers].sort((a, b) => a.minDays - b.minDays),
  });

  const resp = await admin.graphql(
    `#graphql
      mutation SetRentalPricingMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key type }
          userErrors { field message }
        }
      }`,
    {
      variables: {
        metafields: [
          {
            ownerId: productGid,
            namespace: "cottage_rentals",
            key: "pricing",
            type: "json",
            value,
          },
        ],
      },
    },
  );

  const json = await resp.json();
  const errs: any[] = json?.data?.metafieldsSet?.userErrors ?? [];
  if (errs.length) {
    throw new Error(errs[0]?.message ?? "Failed to save product pricing metafield.");
  }
}

