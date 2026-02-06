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
    const result = await registerWebhooks({ session });
    return { ok: true, result };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
};

