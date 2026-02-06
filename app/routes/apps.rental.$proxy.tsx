import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { checkoutAction, quoteLoader, reserveAction } from "~/rental";

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

export const loader = async (args: LoaderFunctionArgs) => {
  const proxy = args.params.proxy ?? "";
  logAppProxyRequest({ request: args.request, proxy });
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
  if (proxy === "reserve") {
    return reserveAction(args);
  }
  if (proxy === "checkout") {
    return checkoutAction(args);
  }
  return new Response("Not Found", { status: 404 });
};

