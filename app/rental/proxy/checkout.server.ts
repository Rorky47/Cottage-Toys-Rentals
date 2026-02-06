import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify";

export const checkoutAction = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Draft Orders are blocked for this app by Shopify's protected customer data rules.
  // We now use the normal cart + cart transform Function for rental pricing.
  try {
    await authenticate.public.appProxy(request);
  } catch (e: any) {
    console.error("[app-proxy] checkout auth failed:", e);
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return json(
    {
      ok: false,
      error: "Draft-order checkout is disabled. Add rentals to cart and use /checkout.",
    },
    { status: 410 },
  );
};
