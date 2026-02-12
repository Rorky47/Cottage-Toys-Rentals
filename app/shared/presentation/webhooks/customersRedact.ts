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
  const { shop, payload, admin } = await authenticate.webhook(request);

  console.log("[GDPR] customers/redact received", { shop, customerId: payload.customer?.id });

  try {
    const customerId = payload.customer?.id;
    const customerEmail = payload.customer?.email;

    if (!customerId && !customerEmail) {
      console.log("[GDPR] No customer identifier provided");
      return new Response("OK", { status: 200 });
    }

    // Query Shopify for all orders by this customer
    const ordersQuery = `#graphql
      query getCustomerOrders($customerId: ID!) {
        customer(id: $customerId) {
          id
          orders(first: 250) {
            edges {
              node {
                id
              }
            }
          }
        }
      }
    `;

    let orderIds: string[] = [];
    
    try {
      const response = await admin.graphql(ordersQuery, {
        variables: { customerId: `gid://shopify/Customer/${customerId}` },
      });
      
      const data = await response.json();
      const orders = data?.data?.customer?.orders?.edges || [];
      
      // Extract numeric order IDs from Shopify GIDs
      orderIds = orders
        .map((edge: any) => edge.node.id)
        .map((gid: string) => gid.replace("gid://shopify/Order/", ""));
      
      console.log(`[GDPR] Found ${orderIds.length} orders for customer ${customerId}`);
    } catch (apiError) {
      console.error("[GDPR] Error fetching customer orders from Shopify:", apiError);
      // Continue with empty order list - nothing to delete
      return new Response("OK", { status: 200 });
    }

    if (orderIds.length === 0) {
      console.log("[GDPR] No orders found for customer, nothing to delete");
      return new Response("OK", { status: 200 });
    }

    // Delete all bookings associated with this customer's orders
    const deletedBookings = await db.booking.deleteMany({
      where: {
        orderId: { in: orderIds },
        rentalItem: { shop },
      },
    });

    console.log("[GDPR] Customer data redacted:", {
      shop,
      customerId,
      customerEmail,
      ordersChecked: orderIds.length,
      bookingsDeleted: deletedBookings.count,
    });

    // The rental items themselves (products, pricing) remain for the merchant
    // as they don't contain customer-specific information.

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing redaction:", error);
    return new Response("Error processing redaction", { status: 500 });
  }
};
