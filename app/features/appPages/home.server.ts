import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";
import { invalidateRentalCache, syncRentalPricingMetafieldForProduct } from "~/rental";
import { authenticate } from "~/shopify";
import { toErrorMessage, normalizeShopifyProductId } from "~/utils";
import type { RentalConfigRow } from "~/features/appPages/types";

export type HomeLoaderData = { 
  rows: RentalConfigRow[];
  privacyAccepted: boolean;
};

function isMetafieldPermissionError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("access denied for metafieldsset") || m.includes("metafieldsset field");
}

async function syncPricingMetafieldBestEffort(opts: Parameters<typeof syncRentalPricingMetafieldForProduct>[0]) {
  try {
    await syncRentalPricingMetafieldForProduct(opts);
    return { ok: true as const };
  } catch (e) {
    const msg = toErrorMessage(e);
    if (isMetafieldPermissionError(msg)) {
      return {
        ok: false as const,
        warning:
          "Saved, but couldn’t sync product pricing metafield (missing Shopify scope `write_products`). Reinstall/reauthorize the app after updating scopes.",
      };
    }
    return { ok: false as const, warning: `Saved, but couldn’t sync product pricing metafield: ${msg}` };
  }
}

type ShopifyProductInfo = {
  title: string | null;
  imageUrl: string | null;
  defaultVariantPrice: string | null;
  shopInventoryOnHand: number | null;
  currencyCode: string;
};

async function fetchShopifyProductInfo(admin: any, shopifyProductId: string): Promise<ShopifyProductInfo> {
  const gid = `gid://shopify/Product/${shopifyProductId}`;
  const response = await admin.graphql(
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
  const currencyCode = String(json?.data?.shop?.currencyCode ?? "USD");
  const product = json?.data?.product ?? null;
  const variants: Array<{ node: { price: string; inventoryQuantity: number | null } }> =
    product?.variants?.edges ?? [];

  const totalQty = variants.reduce((sum, e) => sum + (e.node.inventoryQuantity ?? 0), 0);
  return {
    title: (product?.title as string | null) ?? null,
    imageUrl: (product?.featuredImage?.url as string | null) ?? null,
    defaultVariantPrice: (variants[0]?.node?.price as string | null) ?? null,
    shopInventoryOnHand: Number.isFinite(totalQty) ? totalQty : null,
    currencyCode,
  };
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<HomeLoaderData> => {
  const { session, admin } = await authenticate.admin(request);


  const rentalItems = await prisma.rentalItem.findMany({
    where: { shop: session.shop },
    include: { rateTiers: { orderBy: { minDays: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows: RentalConfigRow[] = [];
  for (const item of rentalItems) {
    let info: ShopifyProductInfo | null = null;
    try {
      info = await fetchShopifyProductInfo(admin, item.shopifyProductId);
    } catch {
      info = null;
    }

    rows.push({
      shopifyProductId: item.shopifyProductId,
      productTitle: info?.title ?? item.name ?? null,
      productImageUrl: info?.imageUrl ?? item.imageUrl ?? null,
      defaultVariantPrice: info?.defaultVariantPrice ?? null,
      shopInventoryOnHand: info?.shopInventoryOnHand ?? null,
      currencyCode: info?.currencyCode ?? item.currencyCode ?? 'USD',
      rentalItem: {
        id: item.id,
        basePricePerDayCents: item.basePricePerDayCents,
        pricingAlgorithm: item.pricingAlgorithm,
        quantity: item.quantity,
        rateTiers: item.rateTiers.map((t) => ({
          id: t.id,
          minDays: t.minDays,
          pricePerDayCents: t.pricePerDayCents,
        })),
      },
    });
  }

  // Check if merchant has accepted privacy policy
  let privacyAccepted = false;
  try {
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shop: session.shop },
    });
    privacyAccepted = !!shopSettings?.privacyAcceptedAt;
  } catch (e) {
    // Table doesn't exist yet - migration pending
    console.warn('[home] ShopSettings table not found, skipping privacy check');
  }

  return { rows, privacyAccepted };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  console.log(`[home.server] Action called with intent: ${intent}`);

  if (intent === "accept_privacy") {
    console.log(`[home.server] Processing privacy acceptance for shop: ${session.shop}`);
    try {
      await prisma.shopSettings.upsert({
        where: { shop: session.shop },
        create: {
          shop: session.shop,
          privacyAcceptedAt: new Date(),
          privacyAcceptedVersion: "2026-02-12",
        },
        update: {
          privacyAcceptedAt: new Date(),
          privacyAcceptedVersion: "2026-02-12",
        },
      });
      console.log(`[home.server] Privacy accepted successfully for ${session.shop}`);
      return { ok: true };
    } catch (error) {
      console.error(`[home.server] Error accepting privacy:`, error);
      return { ok: false, error: "Failed to accept privacy policy" };
    }
  }

  if (intent === "track_product") {
    const rawProductId = String(formData.get("productId") ?? "");
    const productId = normalizeShopifyProductId(rawProductId);
    if (!productId) return { ok: false, error: "Enter a valid Shopify product ID." };

    // Validate product exists and get defaults
    const res = await admin.graphql(
      `#graphql
        query ValidateProductForEnable($id: ID!) {
          product(id: $id) {
            id
            title
            featuredImage { url }
            variants(first: 50) { edges { node { id price inventoryQuantity } } }
          }
          shop { currencyCode }
        }`,
      { variables: { id: `gid://shopify/Product/${productId}` } },
    );
    const json = await res.json();
    const product = json?.data?.product;
    if (!product?.id) return { ok: false, error: "Product not found (or missing access)." };

    // Auto-enable rentals with defaults from Shopify
    const currencyCode = String(json?.data?.shop?.currencyCode ?? "USD");
    const variants: Array<{ node: { price: string; inventoryQuantity: number | null } }> =
      product?.variants?.edges ?? [];
    const firstPrice = variants[0]?.node?.price ?? "0";
    const basePricePerDayCents = Math.round(Number(firstPrice) * 100);
    const totalQty = variants.reduce((sum, e) => sum + (e.node.inventoryQuantity ?? 0), 0);
    const quantity = Number.isFinite(totalQty) ? Math.max(0, totalQty) : 0;

    const saved = await prisma.rentalItem.upsert({
      where: { shop_shopifyProductId: { shop: session.shop, shopifyProductId: productId } },
      create: {
        shop: session.shop,
        shopifyProductId: productId,
        name: product.title ?? null,
        imageUrl: product.featuredImage?.url ?? null,
        currencyCode,
        basePricePerDayCents: Number.isFinite(basePricePerDayCents) ? Math.max(0, basePricePerDayCents) : 0,
        quantity,
      },
      update: {
        name: product.title ?? null,
        imageUrl: product.featuredImage?.url ?? null,
        currencyCode,
      },
    });

    // Sync pricing metafield
    const syncResult = await syncPricingMetafieldBestEffort({
      admin,
      shopifyProductId: productId,
      basePricePerDayCents: saved.basePricePerDayCents,
      tiers: [],
    });

    invalidateRentalCache(session.shop, productId);
    return { ok: true, action: "tracked", ...(syncResult.ok ? {} : { warning: syncResult.warning }) };
  }

  if (intent === "remove_product") {
    const productId = String(formData.get("productId") ?? "");
    const normalized = normalizeShopifyProductId(productId);
    if (!normalized) return { ok: false, error: "Missing productId." };

    // Delete rental item (bookings and rate tiers cascade)
    await prisma.rentalItem.deleteMany({
      where: { shop: session.shop, shopifyProductId: normalized },
    });

    invalidateRentalCache(session.shop, normalized);
    return { ok: true, action: "removed" };
  }

  if (intent === "untrack_product") {
    const refId = String(formData.get("refId") ?? "");
    if (!refId) return { ok: false, error: "Missing refId." };
    await prisma.productReference.deleteMany({ where: { id: refId, shop: session.shop } });
    return { ok: true, action: "untracked" };
  }

  if (intent === "track_existing_rental") {
    const productId = String(formData.get("productId") ?? "");
    const normalized = normalizeShopifyProductId(productId);
    if (!normalized) return { ok: false, error: "Missing productId." };
    await prisma.productReference.upsert({
      where: { shop_shopifyProductId: { shop: session.shop, shopifyProductId: normalized } },
      create: { shop: session.shop, shopifyProductId: normalized },
      update: {},
    });
    return { ok: true, action: "tracked" };
  }

  if (intent === "enable_rentals") {
    const productId = String(formData.get("productId") ?? "");
    const normalized = normalizeShopifyProductId(productId);
    if (!normalized) return { ok: false, error: "Missing productId." };

    // Validate + pull defaults (base price/day + inventory).
    const res = await admin.graphql(
      `#graphql
        query ValidateProductForEnable($id: ID!) {
          product(id: $id) {
            id
            title
            featuredImage { url }
            variants(first: 50) { edges { node { id price inventoryQuantity } } }
          }
          shop { currencyCode }
        }`,
      { variables: { id: `gid://shopify/Product/${normalized}` } },
    );
    const json = await res.json();
    const product = json?.data?.product;
    if (!product?.id) return { ok: false, error: "Product not found (or missing access)." };

    const currencyCode = String(json?.data?.shop?.currencyCode ?? "USD");
    const variants: Array<{ node: { price: string; inventoryQuantity: number | null } }> =
      product?.variants?.edges ?? [];
    const firstPrice = variants[0]?.node?.price ?? "0";
    const basePricePerDayCents = Math.round(Number(firstPrice) * 100);
    const totalQty = variants.reduce((sum, e) => sum + (e.node.inventoryQuantity ?? 0), 0);
    const quantity = Number.isFinite(totalQty) ? Math.max(0, totalQty) : 0;

    const saved = await prisma.rentalItem.upsert({
      where: { shop_shopifyProductId: { shop: session.shop, shopifyProductId: normalized } },
      create: {
        shop: session.shop,
        shopifyProductId: normalized,
        name: product.title ?? null,
        imageUrl: product.featuredImage?.url ?? null,
        currencyCode,
        basePricePerDayCents: Number.isFinite(basePricePerDayCents) ? Math.max(0, basePricePerDayCents) : 0,
        quantity,
      },
      update: {
        name: product.title ?? null,
        imageUrl: product.featuredImage?.url ?? null,
        currencyCode,
        ...(Number.isFinite(basePricePerDayCents) ? { basePricePerDayCents: Math.max(0, basePricePerDayCents) } : {}),
        ...(Number.isFinite(quantity) ? { quantity } : {}),
      },
    });

    const syncResult = await syncPricingMetafieldBestEffort({
      admin,
      shopifyProductId: normalized,
      basePricePerDayCents: saved.basePricePerDayCents,
      tiers: [],
    });

    invalidateRentalCache(session.shop, normalized);
    return { ok: true, action: "enabled", ...(syncResult.ok ? {} : { warning: syncResult.warning }) };
  }

  if (intent === "update_base") {
    const rentalItemId = String(formData.get("rentalItemId") ?? "");
    const basePricePerDay = String(formData.get("basePricePerDay") ?? "");
    const quantity = String(formData.get("quantity") ?? "0");

    const cents = Math.round(Number(basePricePerDay) * 100);
    const qty = Math.floor(Number(quantity));
    if (!rentalItemId) return { ok: false, error: "Missing rentalItemId." };
    if (!Number.isFinite(cents) || cents < 0) return { ok: false, error: "Invalid base price." };
    if (!Number.isFinite(qty) || qty < 0) return { ok: false, error: "Invalid quantity." };

    await prisma.rentalItem.updateMany({
      where: { id: rentalItemId, shop: session.shop },
      data: { basePricePerDayCents: cents, quantity: qty },
    });

    const it = await prisma.rentalItem.findFirst({
      where: { id: rentalItemId, shop: session.shop },
      include: { rateTiers: { orderBy: { minDays: "asc" } } },
    });
    if (it) {
      invalidateRentalCache(session.shop, it.shopifyProductId);
      const syncResult = await syncPricingMetafieldBestEffort({
        admin,
        shopifyProductId: it.shopifyProductId,
        basePricePerDayCents: it.basePricePerDayCents,
        tiers: it.rateTiers.map((t) => ({ minDays: t.minDays, pricePerDayCents: t.pricePerDayCents })),
      });
      return { ok: true, action: "updated", ...(syncResult.ok ? {} : { warning: syncResult.warning }) };
    }

    return { ok: true, action: "updated" };
  }

  if (intent === "set_pricing_mode") {
    const rentalItemId = String(formData.get("rentalItemId") ?? "");
    const mode = String(formData.get("mode") ?? "");
    if (!rentalItemId) return { ok: false, error: "Missing rentalItemId." };
    if (mode !== "flat" && mode !== "tiered") return { ok: false, error: "Invalid mode." };

    const it = await prisma.rentalItem.findFirst({
      where: { id: rentalItemId, shop: session.shop },
      include: { rateTiers: { orderBy: { minDays: "asc" } } },
    });
    if (!it) return { ok: false, error: "Rental item not found." };

    if (mode === "flat") {
      await prisma.rentalItem.updateMany({
        where: { id: it.id, shop: session.shop },
        data: { pricingAlgorithm: "FLAT" },
      });
      // Keep tiers in database - just don't use them in flat mode
      invalidateRentalCache(session.shop, it.shopifyProductId);
      const syncResult = await syncPricingMetafieldBestEffort({
        admin,
        shopifyProductId: it.shopifyProductId,
        basePricePerDayCents: it.basePricePerDayCents,
        tiers: [],
      });
      return { ok: true, action: "pricing_flat", ...(syncResult.ok ? {} : { warning: syncResult.warning }) };
    }

    await prisma.rentalItem.updateMany({
      where: { id: it.id, shop: session.shop },
      data: { pricingAlgorithm: "TIERED" },
    });

    invalidateRentalCache(session.shop, it.shopifyProductId);
    // Tiered mode can exist even with 0 tiers (meaning "no discounts/overrides yet").
    const refreshed = await prisma.rentalItem.findFirst({
      where: { id: it.id, shop: session.shop },
      include: { rateTiers: { orderBy: { minDays: "asc" } } },
    });

    const tiers = (refreshed?.rateTiers ?? []).map((t) => ({
      minDays: t.minDays,
      pricePerDayCents: t.pricePerDayCents,
    }));

    const syncResult = await syncPricingMetafieldBestEffort({
      admin,
      shopifyProductId: it.shopifyProductId,
      basePricePerDayCents: it.basePricePerDayCents,
      tiers,
    });

    return { ok: true, action: "pricing_tiered", ...(syncResult.ok ? {} : { warning: syncResult.warning }) };
  }

  if (intent === "add_tier") {
    const rentalItemId = String(formData.get("rentalItemId") ?? "");
    const minDays = Math.floor(Number(formData.get("minDays") ?? ""));
    const pricePerDay = String(formData.get("pricePerDay") ?? "");
    const cents = Math.round(Number(pricePerDay) * 100);

    if (!rentalItemId) return { ok: false, error: "Missing rentalItemId." };
    if (!Number.isFinite(minDays) || minDays < 1) return { ok: false, error: "Invalid min days." };
    if (!Number.isFinite(cents) || cents < 0) return { ok: false, error: "Invalid price/day." };

    await prisma.rentalItem.updateMany({
      where: { id: rentalItemId, shop: session.shop },
      data: { pricingAlgorithm: "TIERED" },
    });

    await prisma.rateTier.upsert({
      where: { rentalItemId_minDays: { rentalItemId, minDays } },
      create: { rentalItemId, minDays, pricePerDayCents: cents },
      update: { pricePerDayCents: cents },
    });

    const it = await prisma.rentalItem.findFirst({
      where: { id: rentalItemId, shop: session.shop },
      include: { rateTiers: { orderBy: { minDays: "asc" } } },
    });
    if (it) {
      invalidateRentalCache(session.shop, it.shopifyProductId);
      const syncResult = await syncPricingMetafieldBestEffort({
        admin,
        shopifyProductId: it.shopifyProductId,
        basePricePerDayCents: it.basePricePerDayCents,
        tiers: it.rateTiers.map((t) => ({ minDays: t.minDays, pricePerDayCents: t.pricePerDayCents })),
      });
      return { ok: true, action: "tier_saved", ...(syncResult.ok ? {} : { warning: syncResult.warning }) };
    }

    return { ok: true, action: "tier_saved" };
  }

  if (intent === "remove_tier") {
    const tierId = String(formData.get("tierId") ?? "");
    if (!tierId) return { ok: false, error: "Missing tierId." };
    const tier = await prisma.rateTier.findFirst({
      where: { id: tierId, rentalItem: { shop: session.shop } },
      include: { rentalItem: true },
    });
    await prisma.rateTier.deleteMany({ where: { id: tierId } });

    if (tier?.rentalItem) {
      const productId = tier.rentalItem.shopifyProductId;
      invalidateRentalCache(session.shop, productId);
      const it = await prisma.rentalItem.findFirst({
        where: { id: tier.rentalItemId, shop: session.shop },
        include: { rateTiers: { orderBy: { minDays: "asc" } } },
      });
      if (it) {
        const syncResult = await syncPricingMetafieldBestEffort({
          admin,
          shopifyProductId: it.shopifyProductId,
          basePricePerDayCents: it.basePricePerDayCents,
          tiers: it.rateTiers.map((t) => ({ minDays: t.minDays, pricePerDayCents: t.pricePerDayCents })),
        });
        return { ok: true, action: "tier_removed", ...(syncResult.ok ? {} : { warning: syncResult.warning }) };
      }
    }
    return { ok: true, action: "tier_removed" };
  }

  return { ok: false, error: "Unknown action." };
};

