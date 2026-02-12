import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import db from "~/db.server";

/**
 * GDPR: shop/redact webhook
 * 
 * When a shop is deleted or uninstalls the app, Shopify sends this webhook
 * 48 hours after uninstall.
 * 
 * We must delete ALL data associated with this shop.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("[GDPR] shop/redact received", { shop });

  try {
    await db.$transaction([
      db.rateTier.deleteMany({ where: { rentalItem: { shop } } }),
      db.booking.deleteMany({ where: { rentalItem: { shop } } }),
      db.rentalItem.deleteMany({ where: { shop } }),
      db.shopSettings.deleteMany({ where: { shop } }),
      db.session.deleteMany({ where: { shop } }),
    ]);

    console.log("[GDPR] Shop data deleted successfully:", { shop });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing shop redaction:", error);
    return new Response("Error processing shop redaction", { status: 500 });
  }
};
