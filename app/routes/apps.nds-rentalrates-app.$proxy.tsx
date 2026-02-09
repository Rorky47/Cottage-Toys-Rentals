import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { checkoutAction, quoteLoader, reserveAction } from "~/rental";
import { validateAppProxySignature } from "~/utils/appProxyAuth";

function addCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function createCorsResponse(body: any, init?: ResponseInit): Response {
  return addCorsHeaders(json(body, init));
}

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
  
  // Handle OPTIONS preflight requests
  if (args.request.method === "OPTIONS") {
    return addCorsHeaders(new Response(null, { status: 204 }));
  }
  
  logAppProxyRequest({ request: args.request, proxy });
  
  // Validate signature for all requests except ping (useful for monitoring)
  if (proxy !== "ping" && !validateRequest(args.request)) {
    console.warn(`[app-proxy] Invalid signature for ${proxy}`);
    return createCorsResponse({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  
  if (proxy === "ping") {
    return createCorsResponse({ ok: true, proxy });
  }
  if (proxy === "quote") {
    const response = await quoteLoader(args);
    return addCorsHeaders(response);
  }
  if (proxy === "reserve" || proxy === "checkout") {
    return createCorsResponse({ ok: false, error: "Method Not Allowed" }, { status: 405 });
  }
  return createCorsResponse({ ok: false, error: "Not Found" }, { status: 404 });
};

export const action = async (args: ActionFunctionArgs) => {
  const proxy = args.params.proxy ?? "";
  
  // Handle OPTIONS preflight requests
  if (args.request.method === "OPTIONS") {
    return addCorsHeaders(new Response(null, { status: 204 }));
  }
  
  logAppProxyRequest({ request: args.request, proxy });
  
  // Validate signature for all POST actions
  if (!validateRequest(args.request)) {
    console.warn(`[app-proxy] Invalid signature for POST ${proxy}`);
    return createCorsResponse({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  
  if (proxy === "reserve") {
    const response = await reserveAction(args);
    return addCorsHeaders(response);
  }
  if (proxy === "checkout") {
    const response = await checkoutAction(args);
    return addCorsHeaders(response);
  }
  return createCorsResponse({ ok: false, error: "Not Found" }, { status: 404 });
};

