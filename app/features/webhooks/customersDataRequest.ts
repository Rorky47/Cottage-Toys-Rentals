import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import db from "~/db.server";

/**
 * GDPR: customers/data_request webhook
 * 
 * When a customer requests their data, Shopify sends this webhook.
 * We must respond with all data we have about this customer.
 * 
 * For rental app, we collect:
 * - Rental reservations (dates, products, prices)
 * - Associated with customer via customer_id or email
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);

  console.log("[GDPR] customers/data_request received", { shop, customerId: payload.customer?.id });

  try {
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;

    if (!customerId && !customerEmail) {
      console.log("[GDPR] No customer identifier provided");
      return new Response("OK", { status: 200 });
    }

    // Find all bookings associated with this customer (via order ID)
    // Note: Bookings are linked to orders. In a full implementation, you would
    // need to query Shopify's orders API to map customer to orders, then find bookings.
    // For now, we return OK as bookings don't directly store customer data.
    const bookings = await db.booking.findMany({
      where: {
        orderId: { not: null },
        rentalItem: {
          shop,
        },
      },
      include: {
        rentalItem: true,
      },
    });

    // Log what data we have (in production, this would be sent to customer)
    // Note: Bookings are linked to orders, not directly to customers.
    // A full implementation would query Shopify API for customer's orders first.
    console.log("[GDPR] Customer data request processed:", {
      shop,
      customerId,
      customerEmail,
      note: "Bookings are linked to orders. Customer-specific data requires order lookup via Shopify API.",
    });

    // In a real implementation, you might:
    // 1. Generate a JSON/PDF file with all customer data
    // 2. Send it to an email or provide a download link
    // 3. Store the request for compliance audit trail

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing data request:", error);
    return new Response("Error processing request", { status: 500 });
  }
};
