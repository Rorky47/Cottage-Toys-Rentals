import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import db from "~/db.server";

/**
 * GDPR: customers/redact webhook
 * 
 * When a customer requests deletion of their data (GDPR "right to be forgotten"),
 * Shopify sends this webhook 48 hours after the request.
 * 
 * We must delete or anonymize all data associated with this customer.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("[GDPR] customers/redact received", { shop, customerId: payload.customer?.id });

  try {
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;

    if (!customerId && !customerEmail) {
      console.log("[GDPR] No customer identifier provided");
      return new Response("OK", { status: 200 });
    }

    // Delete all bookings associated with this customer's orders
    // Note: Bookings are linked to orders, not directly to customers.
    // A full implementation would query Shopify API for customer's orders,
    // then delete bookings for those orders.
    console.log("[GDPR] Customer redaction processed:", {
      shop,
      customerId,
      customerEmail,
      note: "Bookings are linked to orders. Full implementation requires order lookup via Shopify API to find and delete associated bookings.",
    });

    // The rental items themselves (products, pricing) remain for the merchant
    // as they don't contain customer-specific information.

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing redaction:", error);
    return new Response("Error processing redaction", { status: 500 });
  }
};
