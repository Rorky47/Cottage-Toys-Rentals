import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate, ensureWebhooksRegistered } from "~/shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  await ensureWebhooksRegistered(session);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

