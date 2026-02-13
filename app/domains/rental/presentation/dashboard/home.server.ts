import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify";
import { normalizeShopifyProductId, toErrorMessage } from "~/utils";
import { syncRentalPricingMetafieldForProduct } from "~/rental/pricingMetafield.server";
import type { RentalConfigRow } from "~/domains/rental/presentation/types";
import { createContainer } from "~/shared/container";
import type { TrackProductInput } from "~/domains/rental/application/useCases/dto/TrackProductDto";
import type { UpdateRentalBasicsInput } from "~/domains/rental/application/useCases/dto/UpdateRentalBasicsDto";
import type { DeleteRentalItemInput } from "~/domains/rental/application/useCases/dto/DeleteRentalItemDto";

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
          "Saved, but couldn't sync product pricing metafield (missing Shopify scope `write_products`). Reinstall/reauthorize the app after updating scopes.",
      };
    }
    return { ok: false as const, warning: `Saved, but couldn't sync product pricing metafield: ${msg}` };
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

/**
 * Loader: Fetch all rental items for this shop and enrich with Shopify data.
 * 
 * Migrated to use GetRentalItemsForDashboardUseCase.
 */
export const loader = async ({ request }: LoaderFunctionArgs): Promise<HomeLoaderData> => {
  const { session, admin } = await authenticate.admin(request);

  // Fetch rental items using use case
  const container = createContainer();
  const getRentalItemsUseCase = container.getGetRentalItemsForDashboardUseCase();
  const result = await getRentalItemsUseCase.execute({ shop: session.shop });

  if (result.isFailure) {
    throw new Error(result.error);
  }

  // Enrich with Shopify product info
  const rows: RentalConfigRow[] = [];
  for (const item of result.value.rentalItems) {
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
      currencyCode: info?.currencyCode ?? item.currencyCode ?? "USD",
      rentalItem: {
        id: item.id,
        basePricePerDayCents: item.basePricePerDayCents,
        pricingAlgorithm: item.pricingAlgorithm,
        quantity: item.quantity,
        rateTiers: item.rateTiers,
      },
    });
  }

  // Check if merchant has accepted privacy policy
  const privacyContainer = createContainer();
  const getPrivacyStatus = privacyContainer.getGetShopPrivacyStatusUseCase();
  const privacyResult = await getPrivacyStatus.execute(session.shop);
  const privacyAccepted = privacyResult.isSuccess ? privacyResult.value : false;

  return { rows, privacyAccepted };
};

/**
 * Action: Handle admin operations (track product, update pricing, remove product, etc.)
 * 
 * Refactored to use domain use cases instead of inline business logic.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  console.log(`[home.server] Action called with intent: ${intent}`);

  // ===== Privacy Acceptance =====
  if (intent === "accept_privacy") {
    console.log(`[home.server] Processing privacy acceptance for shop: ${session.shop}`);
    
    const container = createContainer();
    const acceptPrivacy = container.getAcceptPrivacyPolicyUseCase();
    const result = await acceptPrivacy.execute({
      shop: session.shop,
      version: "2026-02-12",
    });

    if (result.isFailure) {
      console.error(`[home.server] Error accepting privacy:`, result.error);
      return { ok: false, error: result.error };
    }

    console.log(`[home.server] Privacy accepted successfully for ${session.shop}`);
    return { ok: true };
  }

  // ===== Track Product (Quick Enable) =====
  if (intent === "track_product") {
    const rawProductId = String(formData.get("productId") ?? "");
    const productId = normalizeShopifyProductId(rawProductId);
    if (!productId) return { ok: false, error: "Enter a valid Shopify product ID." };

    const container = createContainer();
    const useCase = container.getTrackProductUseCase(admin);
    const input: TrackProductInput = { shop: session.shop, shopifyProductId: productId };
    const result = await useCase.execute(input);

    if (result.isFailure) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      action: "tracked",
      ...(result.value.warning ? { warning: result.value.warning } : {}),
    };
  }

  // ===== Enable Rentals (Full Product Setup) =====
  if (intent === "enable_rentals") {
    const rawProductId = String(formData.get("productId") ?? "");
    const productId = normalizeShopifyProductId(rawProductId);
    if (!productId) return { ok: false, error: "Missing productId." };

    const container = createContainer();
    const useCase = container.getTrackProductUseCase(admin);
    const input: TrackProductInput = { shop: session.shop, shopifyProductId: productId };
    const result = await useCase.execute(input);

    if (result.isFailure) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      action: "enabled",
      ...(result.value.warning ? { warning: result.value.warning } : {}),
    };
  }

  // ===== Remove Product =====
  if (intent === "remove_product") {
    const rawProductId = String(formData.get("productId") ?? "");
    const productId = normalizeShopifyProductId(rawProductId);
    if (!productId) return { ok: false, error: "Missing productId." };

    const container = createContainer();
    const useCase = container.getDeleteRentalItemUseCase(admin);
    const input: DeleteRentalItemInput = { shop: session.shop, shopifyProductId: productId };
    const result = await useCase.execute(input);

    if (result.isFailure) {
      return { ok: false, error: result.error };
    }

    return { ok: true, action: "removed" };
  }

  // ===== Update Base Price & Quantity =====
  if (intent === "update_base") {
    const rentalItemId = String(formData.get("rentalItemId") ?? "");
    const basePricePerDay = String(formData.get("basePricePerDay") ?? "");
    const quantity = String(formData.get("quantity") ?? "0");

    const cents = Math.round(Number(basePricePerDay) * 100);
    const qty = Math.floor(Number(quantity));

    if (!rentalItemId) return { ok: false, error: "Missing rentalItemId." };
    if (!Number.isFinite(cents) || cents < 0) return { ok: false, error: "Invalid base price." };
    if (!Number.isFinite(qty) || qty < 0) return { ok: false, error: "Invalid quantity." };

    const container = createContainer();
    const useCase = container.getUpdateRentalBasicsUseCase(admin);
    const input: UpdateRentalBasicsInput = { shop: session.shop, rentalItemId: rentalItemId, basePricePerDayCents: cents, quantity: qty };
    const result = await useCase.execute(input);

    if (result.isFailure) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      action: "updated",
      ...(result.value.warning ? { warning: result.value.warning } : {}),
    };
  }

  // ===== Set Pricing Mode (Flat vs Tiered) =====
  if (intent === "set_pricing_mode") {
    const rentalItemId = String(formData.get("rentalItemId") ?? "");
    const mode = String(formData.get("mode") ?? "");

    if (!rentalItemId) return { ok: false, error: "Missing rentalItemId." };
    if (mode !== "flat" && mode !== "tiered") {
      return { ok: false, error: "Invalid pricing mode. Must be 'flat' or 'tiered'." };
    }

    const pricingAlgorithm = mode === "flat" ? "FLAT" : "TIERED";

    // Use UpdateRentalItemUseCase to change pricing algorithm
    const container = createContainer();
    const rentalItemRepo = container.getRentalItemRepository();
    
    const rentalItem = await rentalItemRepo.findById(rentalItemId);
    if (!rentalItem) {
      return { ok: false, error: "Rental item not found." };
    }

    // Update pricing algorithm (keeps existing tiers)
    const updateResult = rentalItem.updatePricing(
      rentalItem.basePricePerDay,
      pricingAlgorithm as "FLAT" | "TIERED",
      rentalItem.rateTiers.map(t => ({
        minDays: t.minDays,
        pricePerDayCents: t.pricePerDay.cents
      })),
      rentalItem.quantity
    );

    if (updateResult.isFailure) {
      return { ok: false, error: updateResult.error };
    }

    await rentalItemRepo.save(rentalItem);

    // Sync metafield
    const syncResult = await syncPricingMetafieldBestEffort({
      admin,
      shopifyProductId: rentalItem.shopifyProductId,
      basePricePerDayCents: rentalItem.basePricePerDay.cents,
      tiers: (rentalItem.rateTiers || []).map(t => ({
        minDays: t.minDays,
        pricePerDayCents: t.pricePerDay.cents
      })),
    });

    return {
      ok: true,
      action: "pricing_mode_changed",
      ...(!syncResult.ok && syncResult.warning ? { warning: syncResult.warning } : {}),
    };
  }

  // ===== Add Tier =====
  if (intent === "add_tier") {
    const rentalItemId = String(formData.get("rentalItemId") ?? "");
    const minDays = String(formData.get("minDays") ?? "");
    const pricePerDay = String(formData.get("pricePerDay") ?? "");

    const minDaysNum = Math.floor(Number(minDays));
    const cents = Math.round(Number(pricePerDay) * 100);

    if (!rentalItemId) return { ok: false, error: "Missing rentalItemId." };
    if (!Number.isFinite(minDaysNum) || minDaysNum < 1) {
      return { ok: false, error: "Min days must be at least 1." };
    }
    if (!Number.isFinite(cents) || cents < 0) {
      return { ok: false, error: "Invalid price." };
    }

    const container = createContainer();
    const rentalItemRepo = container.getRentalItemRepository();
    
    const rentalItem = await rentalItemRepo.findById(rentalItemId);
    if (!rentalItem) {
      return { ok: false, error: "Rental item not found." };
    }

    // Check for duplicate minDays
    const existingMinDays = (rentalItem.rateTiers || []).map(t => t.minDays);
    if (existingMinDays.includes(minDaysNum)) {
      return { ok: false, error: `A tier for ${minDaysNum} days already exists. Please use a different number of days.` };
    }

    // Add new tier
    const existingTiers = rentalItem.rateTiers.map(t => ({
      minDays: t.minDays,
      pricePerDayCents: t.pricePerDay.cents
    }));
    const newTiers = [...existingTiers, { minDays: minDaysNum, pricePerDayCents: cents }];

    const updateResult = rentalItem.updatePricing(
      rentalItem.basePricePerDay,
      rentalItem.pricingAlgorithm,
      newTiers,
      rentalItem.quantity
    );

    if (updateResult.isFailure) {
      return { ok: false, error: updateResult.error };
    }

    await rentalItemRepo.save(rentalItem);

    // Sync metafield
    const syncResult = await syncPricingMetafieldBestEffort({
      admin,
      shopifyProductId: rentalItem.shopifyProductId,
      basePricePerDayCents: rentalItem.basePricePerDay.cents,
      tiers: (rentalItem.rateTiers || []).map(t => ({
        minDays: t.minDays,
        pricePerDayCents: t.pricePerDay.cents
      })),
    });

    return {
      ok: true,
      action: "tier_added",
      ...(!syncResult.ok && syncResult.warning ? { warning: syncResult.warning } : {}),
    };
  }

  // ===== Remove Tier =====
  if (intent === "remove_tier") {
    const tierId = String(formData.get("tierId") ?? "");

    if (!tierId) return { ok: false, error: "Missing tierId." };

    // Find which rental item owns this tier (need raw data with IDs)
    const container = createContainer();
    const rentalItemRepo = container.getRentalItemRepository();
    
    // Get all rental items with tier IDs
    const rentalItemsWithTierIds = await rentalItemRepo.findByShopWithTierIds(session.shop);
    let targetItem = null;
    
    for (const item of rentalItemsWithTierIds) {
      if (item.rateTiers.some(t => t.id === tierId)) {
        targetItem = item;
        break;
      }
    }

    if (!targetItem) {
      return { ok: false, error: "Tier not found." };
    }

    // Fetch the full domain entity
    const rentalItem = await rentalItemRepo.findById(targetItem.id);
    if (!rentalItem) {
      return { ok: false, error: "Rental item not found." };
    }

    // Remove the tier by matching minDays and price (since domain entity doesn't have IDs)
    const tierToRemove = targetItem.rateTiers.find(t => t.id === tierId);
    if (!tierToRemove) {
      return { ok: false, error: "Tier not found." };
    }

    const newTiers = rentalItem.rateTiers
      .filter(t => !(t.minDays === tierToRemove.minDays && t.pricePerDay.cents === tierToRemove.pricePerDayCents))
      .map(t => ({
        minDays: t.minDays,
        pricePerDayCents: t.pricePerDay.cents
      }));

    const updateResult = rentalItem.updatePricing(
      rentalItem.basePricePerDay,
      rentalItem.pricingAlgorithm,
      newTiers,
      rentalItem.quantity
    );

    if (updateResult.isFailure) {
      return { ok: false, error: updateResult.error };
    }

    await rentalItemRepo.save(rentalItem);

    // Sync metafield
    const syncResult = await syncPricingMetafieldBestEffort({
      admin,
      shopifyProductId: rentalItem.shopifyProductId,
      basePricePerDayCents: rentalItem.basePricePerDay.cents,
      tiers: (rentalItem.rateTiers || []).map(t => ({
        minDays: t.minDays,
        pricePerDayCents: t.pricePerDay.cents
      })),
    });

    return {
      ok: true,
      action: "tier_removed",
      ...(!syncResult.ok && syncResult.warning ? { warning: syncResult.warning } : {}),
    };
  }

  return { ok: false, error: "Unknown intent" };
};
