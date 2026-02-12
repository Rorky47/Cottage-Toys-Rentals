import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, registerWebhooks } from "~/shopify";

type WebhookRow = {
  id: string;
  topic: string;
  callbackUrl: string | null;
  endpointType: string;
};

export type WebhooksLoaderData = { rows: WebhookRow[]; ordersPaid: WebhookRow | null };

export const loader = async ({ request }: LoaderFunctionArgs): Promise<WebhooksLoaderData> => {
  const { admin } = await authenticate.admin(request);
  const resp = await admin.graphql(
    `#graphql
      query ListWebhookSubscriptions {
        webhookSubscriptions(first: 50) {
          nodes {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint { callbackUrl }
            }
          }
        }
      }`,
  );
  const json = await resp.json();
  const nodes: any[] = json?.data?.webhookSubscriptions?.nodes ?? [];

  const rows: WebhookRow[] = nodes.map((w) => ({
    id: String(w?.id ?? ""),
    topic: String(w?.topic ?? ""),
    endpointType: String(w?.endpoint?.__typename ?? ""),
    callbackUrl: w?.endpoint?.callbackUrl ? String(w.endpoint.callbackUrl) : null,
  }));

  const ordersPaid = rows.find((r) => r.topic === "ORDERS_PAID") ?? null;
  return { rows, ordersPaid };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  if (intent !== "register") return { ok: false, error: "Unknown action." };

  try {
    console.log("[webhooks] Attempting to register webhooks for shop:", session.shop);
    const result = await registerWebhooks({ session });
    console.log("[webhooks] Registration result:", JSON.stringify(result, null, 2));
    
    // Check for failures
    const ordersPaid = (result as any)?.ORDERS_PAID as Array<{ success?: boolean; result?: unknown }> | undefined;
    if (Array.isArray(ordersPaid)) {
      const failures = ordersPaid.filter((r) => r && r.success === false);
      if (failures.length) {
        const errorMsg = JSON.stringify(failures[0]?.result ?? failures[0], null, 2);
        console.error("[webhooks] ORDERS_PAID registration failed:", errorMsg);
        return { ok: false, error: `Registration failed: ${errorMsg}` };
      }
    }
    
    return { ok: true, result };
  } catch (e: any) {
    console.error("[webhooks] Registration error:", e);
    return { ok: false, error: String(e?.message ?? e) };
  }
};

