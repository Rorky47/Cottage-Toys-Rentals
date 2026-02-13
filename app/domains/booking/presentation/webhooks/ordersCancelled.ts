import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify";
import { createContainer } from "~/shared/container";

/**
 * Webhook handler for orders/cancelled event.
 * 
 * When an order is cancelled:
 * 1. Find all bookings by order ID
 * 2. Cancel those bookings (changes status to CANCELLED)
 * 3. Free up inventory for new bookings
 * 
 * Handles both merchant-initiated and customer-initiated cancellations.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);
    console.log(`[ordersCancelled] Received ${topic} webhook for ${shop}`);

    const orderId = String(payload?.id ?? payload?.admin_graphql_api_id ?? "");
    if (!orderId) {
      console.error("[ordersCancelled] No order ID in payload");
      return new Response("Missing order ID", { status: 400 });
    }

    console.log(`[ordersCancelled] Order cancelled: ${orderId}`);

    // Cancel all bookings for this order
    const container = createContainer();
    const cancelBookingsUseCase = container.getCancelBookingsByOrderIdUseCase();
    
    const result = await cancelBookingsUseCase.execute({
      orderId,
      reason: "Order cancelled",
    });

    if (result.isFailure) {
      console.error(`[ordersCancelled] Failed to cancel bookings: ${result.error}`);
      return new Response("Internal Server Error", { status: 500 });
    }

    console.log(
      `[ordersCancelled] Cancelled ${result.value.cancelledCount} bookings for order ${orderId}`
    );

    if (result.value.cancelledCount > 0) {
      console.log(`[ordersCancelled] Freed up inventory for bookings: ${result.value.bookingIds.join(", ")}`);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("[ordersCancelled] Webhook failed:", error);
    // Return 500 so Shopify will retry the webhook
    return new Response("Internal Server Error", { status: 500 });
  }
};
