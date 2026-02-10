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
    // Delete all rentals for this shop
    const rentalsDeleted = await db.rental.deleteMany({
      where: { shop },
    });

    // Delete all rental items for this shop
    const itemsDeleted = await db.rentalItem.deleteMany({
      where: { shop },
    });

    // Delete all pricing tiers for this shop
    const tiersDeleted = await db.pricingTier.deleteMany({
      where: {
        rentalItem: {
          shop,
        },
      },
    });

    // Delete the shop session (auth data)
    const sessionsDeleted = await db.session.deleteMany({
      where: { shop },
    });

    console.log("[GDPR] Shop data deleted:", {
      shop,
      rentalsDeleted: rentalsDeleted.count,
      itemsDeleted: itemsDeleted.count,
      tiersDeleted: tiersDeleted.count,
      sessionsDeleted: sessionsDeleted.count,
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing shop redaction:", error);
    return new Response("Error processing shop redaction", { status: 500 });
  }
};
