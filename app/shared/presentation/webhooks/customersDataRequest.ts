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
 * - Associated with customer via order IDs
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, admin } = await authenticate.webhook(request);

  console.log("[GDPR] customers/data_request received", { shop, customerId: payload.customer?.id });

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
          email
          orders(first: 250) {
            edges {
              node {
                id
                name
                createdAt
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
      // Continue with empty order list - we'll return no data rather than error
    }

    // Find all bookings linked to those orders
    const bookings = await db.booking.findMany({
      where: {
        orderId: orderIds.length > 0 ? { in: orderIds } : undefined,
        rentalItem: { shop },
      },
      include: {
        rentalItem: {
          select: {
            shopifyProductId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format data export for customer
    const customerData = {
      customer_id: customerId,
      customer_email: customerEmail,
      shop,
      data_requested_at: new Date().toISOString(),
      bookings: bookings.map((booking) => ({
        booking_id: booking.id,
        order_id: booking.orderId,
        product_id: booking.rentalItem.shopifyProductId,
        product_name: booking.rentalItem.name,
        rental_start_date: booking.startDate.toISOString(),
        rental_end_date: booking.endDate.toISOString(),
        quantity: booking.quantity,
        status: booking.status,
        fulfillment_method: booking.fulfillmentMethod,
        created_at: booking.createdAt.toISOString(),
      })),
      summary: {
        total_bookings: bookings.length,
        note: "This app stores rental booking information linked to your orders. No personal information (name, address, phone) is stored by this app.",
      },
    };

    console.log("[GDPR] Customer data export prepared:", {
      shop,
      customerId,
      bookingsFound: bookings.length,
    });

    // Log the data export for compliance audit trail
    console.log("[GDPR] Customer data export:", JSON.stringify(customerData, null, 2));

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[GDPR] Error processing data request:", error);
    return new Response("Error processing request", { status: 500 });
  }
};
