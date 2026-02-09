import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { checkoutAction, quoteLoader, reserveAction } from "~/rental";
import { validateAppProxySignature } from "~/utils/appProxyAuth";

function logAppProxyRequest(args: { request: Request; proxy: string }) {
  try {
    const url = new URL(args.request.url);
    const shop = url.searchParams.get("shop");
    const hasSignature = Boolean(url.searchParams.get("signature"));
    // Intentionally do not log full query string (contains signature).
    console.log(`[app-proxy] ${args.request.method} /apps/rental/${args.proxy} shop=${shop ?? "?"} signature=${hasSignature ? "yes" : "no"}`);
  } catch {
    // ignore logging failures
  }
}

function validateRequest(request: Request): boolean {
  const url = new URL(request.url);
  const secret = process.env.SHOPIFY_API_SECRET || "";
  
  if (!secret) {
    console.error("[app-proxy] SHOPIFY_API_SECRET not configured");
    return false;
  }
  
  return validateAppProxySignature(url.searchParams, secret);
}

export const loader = async (args: LoaderFunctionArgs) => {
  const proxy = args.params.proxy ?? "";
  logAppProxyRequest({ request: args.request, proxy });
  
  // Validate signature for all requests except ping (useful for monitoring)
  if (proxy !== "ping" && !validateRequest(args.request)) {
    console.warn(`[app-proxy] Invalid signature for ${proxy}`);
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  
  if (proxy === "ping") {
    return json({ ok: true, proxy });
  }
  if (proxy === "quote") {
    return quoteLoader(args);
  }
  if (proxy === "reserve" || proxy === "checkout") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  throw new Response("Not Found", { status: 404 });
};

export const action = async (args: ActionFunctionArgs) => {
  const proxy = args.params.proxy ?? "";
  logAppProxyRequest({ request: args.request, proxy });
  
  // Validate signature for all POST actions
  if (!validateRequest(args.request)) {
    console.warn(`[app-proxy] Invalid signature for POST ${proxy}`);
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  
  if (proxy === "reserve") {
    return reserveAction(args);
  }
  if (proxy === "checkout") {
    return checkoutAction(args);
  }
  return new Response("Not Found", { status: 404 });
};

