/**
 * Shopify metafield sync for rental pricing.
 * Updates product metafields so themes can display rental rates without API calls.
 * 
 * **Status**: Active and working
 * **Future improvement**: Could be abstracted to ShopifyMetafieldAdapter pattern
 * **Current usage**: Called by ShopifyProductAdapter when products are tracked/updated
 */

export type RentalPricingTier = { minDays: number; pricePerDayCents: number };

/**
 * Syncs rental pricing configuration to Shopify product metafields.
 * This allows themes to display pricing without API calls.
 */
export async function syncRentalPricingMetafieldForProduct(opts: {
  admin: any;
  shopifyProductId: string;
  basePricePerDayCents: number;
  tiers: RentalPricingTier[];
}) {
  const { admin, shopifyProductId, basePricePerDayCents, tiers } = opts;

  const productGid = `gid://shopify/Product/${shopifyProductId}`;
  const sortedTiers = (tiers || []).sort((a, b) => a.minDays - b.minDays);
  const value = JSON.stringify({
    basePricePerDayCents,
    tiers: sortedTiers,
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

