import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  DeliveryMethod,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

type WebhookRegistrationState = "registered" | "blocked" | "failed";
type WebhookRegistrationInfo = {
  state: WebhookRegistrationState;
  details?: string;
};

const webhookRegistrationByShop = new Map<string, WebhookRegistrationInfo>();

function looksLikeProtectedCustomerDataBlock(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not approved") &&
    (m.includes("protected customer data") || m.includes("customer_data") || m.includes("customer data"))
  );
}

export async function ensureWebhooksRegistered(session: any) {
  const shop = String(session?.shop ?? "");
  if (!shop) return;
  if (webhookRegistrationByShop.has(shop)) return;
  try {
    const result = await shopify.registerWebhooks({ session });

    // The underlying library already logs per-topic failures, but we make it explicit and
    // avoid retrying on every request.
    let state: WebhookRegistrationState = "registered";
    let details: string | undefined;
    try {
      const ordersPaid = (result as any)?.ORDERS_PAID as Array<{ success?: boolean; result?: unknown }> | undefined;
      if (Array.isArray(ordersPaid)) {
        const failures = ordersPaid.filter((r) => r && r.success === false);
        if (failures.length) {
          const msg = JSON.stringify(failures[0]?.result ?? "");
          if (looksLikeProtectedCustomerDataBlock(msg)) {
            state = "blocked";
            details = "ORDERS_PAID blocked (protected customer data approval required).";
          } else {
            state = "failed";
            details = "ORDERS_PAID failed to register.";
          }
        }
      }
    } catch {
      // ignore parsing errors
    }

    webhookRegistrationByShop.set(shop, { state, details });
    if (state === "registered") console.log(`[webhooks] register attempt for ${shop}: ok`);
    else console.warn(`[webhooks] register attempt for ${shop}: ${details ?? state}`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    webhookRegistrationByShop.set(shop, {
      state: looksLikeProtectedCustomerDataBlock(msg) ? "blocked" : "failed",
      details: msg,
    });
    console.warn(`[webhooks] register attempt for ${shop}: ${msg}`);
  }
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/uninstalled",
    },
    APP_SCOPES_UPDATE: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/app/scopes_update",
    },
    ORDERS_PAID: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: "/webhooks/orders/paid",
    },
  },
  hooks: {
    afterAuth: async ({ admin, session }) => {
      // Always register webhooks after auth/install.
      // (Previously this could be skipped by early returns in the cart-transform logic.)
      await ensureWebhooksRegistered(session);

      // Ensure the cart transform is enabled so checkout totals can be overridden.
      // Without this, the Function code exists but never runs for the shop.
      const statusResp = await admin.graphql(
        `#graphql
          query EnsureCartTransform {
            shopifyFunctions(first: 50) { nodes { id title apiType } }
            cartTransforms(first: 50) { nodes { id functionId } }
          }`,
      );
      const statusJson = await statusResp.json();
      const funcs: Array<{ id: string; title: string; apiType: string }> =
        statusJson?.data?.shopifyFunctions?.nodes ?? [];
      const transforms: Array<{ id: string; functionId: string }> =
        statusJson?.data?.cartTransforms?.nodes ?? [];

      const fn =
        funcs.find((f) => String(f.title).toLowerCase().includes("cart price multiplier")) ?? null;
      if (!fn) return;
      if (transforms.some((t) => t.functionId === fn.id)) return;

      await admin.graphql(
        `#graphql
          mutation EnableTransform($functionId: String!, $blockOnFailure: Boolean!) {
            cartTransformCreate(functionId: $functionId, blockOnFailure: $blockOnFailure) {
              userErrors { field message }
              cartTransform { id functionId }
            }
          }`,
        { variables: { functionId: fn.id, blockOnFailure: false } },
      );
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
