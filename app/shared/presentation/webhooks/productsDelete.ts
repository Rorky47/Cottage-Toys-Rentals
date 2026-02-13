import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify";
import { createContainer } from "~/shared/container";
import db from "~/db.server";

/**
 * Webhook handler for products/delete event.
 * 
 * When a Shopify product is deleted:
 * 1. Find rental item by shopifyProductId
 * 2. Cancel all RESERVED bookings (free up inventory)
 * 3. Keep CONFIRMED bookings (merchant handles via calendar)
 * 4. Keep rental item (needed for historical bookings)
 * 
 * Note: Metafield is automatically deleted by Shopify with the product.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);
    console.log(`[productsDelete] Received ${topic} webhook for ${shop}`);

    const productId = String(payload?.id ?? "");
    if (!productId) {
      console.error("[productsDelete] No product ID in payload");
      return new Response("Missing product ID", { status: 400 });
    }

    console.log(`[productsDelete] Product deleted: ${productId}`);

    // 1. Find rental item for this product
    const rentalItem = await db.rentalItem.findUnique({
      where: {
        shop_shopify_product_id: {
          shop,
          shopify_product_id: productId,
        },
      },
      select: { id: true },
    });

    if (!rentalItem) {
      console.log(`[productsDelete] Product ${productId} was not tracked for rentals`);
      return new Response(null, { status: 200 });
    }

    console.log(`[productsDelete] Found rental item ${rentalItem.id} for product ${productId}`);

    // 2. Cancel all RESERVED bookings
    const container = createContainer();
    const cancelReservedUseCase = container.getCancelReservedBookingsByRentalItemUseCase();
    
    const result = await cancelReservedUseCase.execute({
      rentalItemId: rentalItem.id,
      reason: "Product deleted from Shopify",
    });

    if (result.isFailure) {
      console.error(`[productsDelete] Failed to cancel bookings: ${result.error}`);
      return new Response("Internal Server Error", { status: 500 });
    }

    console.log(
      `[productsDelete] Cancelled ${result.value.cancelledCount} RESERVED bookings for product ${productId}`
    );

    // Note: We keep the rental item in the database for historical CONFIRMED bookings
    // Note: Metafield is automatically deleted by Shopify when product is deleted

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("[productsDelete] Webhook failed:", error);
    // Return 500 so Shopify will retry the webhook
    return new Response("Internal Server Error", { status: 500 });
  }
};
