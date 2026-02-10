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

    // Find all rentals associated with this customer
    const rentals = await db.rental.findMany({
      where: {
        shop,
        OR: [
          customerId ? { customerId: String(customerId) } : undefined,
          customerEmail ? { customerEmail } : undefined,
        ].filter(Boolean),
      },
      include: {
        item: true,
      },
    });

    // Log what data we have (in production, this would be sent to customer)
    console.log("[GDPR] Customer data found:", {
      shop,
      customerId,
      customerEmail,
      rentalsCount: rentals.length,
      rentals: rentals.map(r => ({
        id: r.id,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        totalPriceCents: r.totalPriceCents,
        productTitle: r.item?.name,
      })),
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
