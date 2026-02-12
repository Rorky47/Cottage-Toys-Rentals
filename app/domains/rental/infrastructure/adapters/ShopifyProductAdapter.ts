import { Result } from "~/shared/kernel/Result";
import type { IShopifyProductAdapter, ShopifyProductInfo } from "./IShopifyProductAdapter";
import { syncRentalPricingMetafieldForProduct } from "~/rental";
import { toErrorMessage } from "~/utils";

/**
 * Shopify product adapter implementation.
 * Wraps Shopify Admin GraphQL API.
 */
export class ShopifyProductAdapter implements IShopifyProductAdapter {
  constructor(private readonly adminApi: any) {}

  async getProductInfo(shopifyProductId: string): Promise<Result<ShopifyProductInfo>> {
    try {
      const gid = `gid://shopify/Product/${shopifyProductId}`;
      const response = await this.adminApi.graphql(
        `#graphql
          query ProductForRentalConfig($id: ID!) {
            product(id: $id) {
              id
              title
              featuredImage { url }
              variants(first: 50) { edges { node { id price inventoryQuantity } } }
            }
            shop { currencyCode }
          }`,
        { variables: { id: gid } },
      );

      const json = await response.json();
      const product = json?.data?.product;
      if (!product?.id) {
        return Result.fail("Product not found or access denied");
      }

      const currencyCode = String(json?.data?.shop?.currencyCode ?? "USD");
      const variants: Array<{ node: { price: string; inventoryQuantity: number | null } }> =
        product?.variants?.edges ?? [];

      const firstPrice = variants[0]?.node?.price ?? "0";
      const defaultVariantPriceCents = Math.round(Number(firstPrice) * 100);
      const totalInventoryQuantity = variants.reduce(
        (sum, e) => sum + (e.node.inventoryQuantity ?? 0),
        0
      );

      return Result.ok({
        title: String(product.title ?? ""),
        imageUrl: (product.featuredImage?.url as string | null) ?? null,
        defaultVariantPriceCents: Math.max(0, defaultVariantPriceCents),
        totalInventoryQuantity: Math.max(0, totalInventoryQuantity),
        currencyCode,
      });
    } catch (error) {
      return Result.fail(`Failed to fetch product info: ${toErrorMessage(error)}`);
    }
  }

  async syncPricingMetafield(
    shopifyProductId: string,
    basePricePerDayCents: number,
    rateTiers: Array<{ minDays: number; pricePerDayCents: number }>
  ): Promise<Result<void, string>> {
    try {
      await syncRentalPricingMetafieldForProduct({
        admin: this.adminApi,
        shopifyProductId,
        basePricePerDayCents,
        tiers: rateTiers,
      });
      return Result.ok(undefined);
    } catch (error) {
      const msg = toErrorMessage(error);
      
      // Check for permission errors
      const msgLower = msg.toLowerCase();
      if (
        msgLower.includes("access denied for metafieldsset") ||
        msgLower.includes("metafieldsset field")
      ) {
        return Result.fail(
          "Couldn't sync product pricing metafield (missing Shopify scope `write_products`). " +
          "Reinstall/reauthorize the app after updating scopes."
        );
      }
      
      return Result.fail(`Couldn't sync product pricing metafield: ${msg}`);
    }
  }

  async deleteRentalPricingMetafield(shopifyProductId: string): Promise<Result<void>> {
    try {
      const productGid = `gid://shopify/Product/${shopifyProductId}`;
      
      const response = await this.adminApi.graphql(
        `#graphql
          mutation DeleteRentalPricingMetafield($productId: ID!) {
            metafieldsDelete(metafields: [{
              ownerId: $productId,
              namespace: "rental",
              key: "pricing"
            }]) {
              deletedMetafields {
                ownerId
                namespace
                key
              }
              userErrors {
                field
                message
              }
            }
          }`,
        { variables: { productId: productGid } },
      );

      const json = await response.json();
      const errors = json?.data?.metafieldsDelete?.userErrors || [];
      
      if (errors.length > 0) {
        console.warn(`[ShopifyProductAdapter] Failed to delete metafield for product ${shopifyProductId}:`, errors);
        // Don't fail - metafield might not exist
      }

      return Result.ok(undefined);
    } catch (error) {
      const msg = toErrorMessage(error);
      console.warn(`[ShopifyProductAdapter] Error deleting metafield for product ${shopifyProductId}:`, msg);
      // Don't fail - this is best effort
      return Result.ok(undefined);
    }
  }
}
