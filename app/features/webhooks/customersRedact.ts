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

    // Delete all rentals associated with this customer
    const deleted = await db.rental.deleteMany({
      where: {
        shop,
        OR: [
          customerId ? { customerId: String(customerId) } : undefined,
          customerEmail ? { customerEmail } : undefined,
        ].filter(Boolean),
      },
    });

    console.log("[GDPR] Customer data deleted:", {
      shop,
      customerId,
      customerEmail,
      rentalsDeleted: deleted.count,
    });

    // Note: We delete rental records since they contain customer info.
    // The rental items themselves (products, pricing) remain for the merchant.

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing redaction:", error);
    return new Response("Error processing redaction", { status: 500 });
  }
};
