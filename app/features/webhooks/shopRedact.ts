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
    // Delete all bookings for this shop (cascades from rental items)
    const bookingsDeleted = await db.booking.deleteMany({
      where: {
        rentalItem: {
          shop,
        },
      },
    });

    // Delete all product references for this shop
    const referencesDeleted = await db.productReference.deleteMany({
      where: { shop },
    });

    // Delete all rental items for this shop (rate tiers cascade automatically)
    const itemsDeleted = await db.rentalItem.deleteMany({
      where: { shop },
    });

    // Delete the shop session (auth data)
    const sessionsDeleted = await db.session.deleteMany({
      where: { shop },
    });

    console.log("[GDPR] Shop data deleted:", {
      shop,
      bookingsDeleted: bookingsDeleted.count,
      referencesDeleted: referencesDeleted.count,
      itemsDeleted: itemsDeleted.count,
      sessionsDeleted: sessionsDeleted.count,
    });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing shop redaction:", error);
    return new Response("Error processing shop redaction", { status: 500 });
  }
};
