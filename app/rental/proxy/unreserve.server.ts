import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify";
import { logger } from "~/utils/logger";
import prisma from "~/db.server";

/**
 * Refactored /unreserve endpoint.
 * 
 * NOTE: This endpoint DELETES reservations rather than canceling them.
 * This is intentional for cart hold scenarios - we don't need audit trail for temporary holds.
 * 
 * For order cancellations (CONFIRMED bookings), use CancelBookingUseCase instead.
 */
export const unreserveAction = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 1. Authentication
  let session: any = null;
  try {
    ({ session } = await authenticate.public.appProxy(request));
  } catch (e: any) {
    logger.error("Unreserve auth failed", e, { shop: (e as { shop?: string })?.shop });
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!session) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // 2. Parse request body
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const bookingRef = String(body?.booking_ref ?? body?.bookingRef ?? "");
  if (!bookingRef) {
    return json({ ok: false, error: "Missing booking_ref" }, { status: 400 });
  }

  // 3. Delete RESERVED booking
  try {
    const deleted = await prisma.booking.deleteMany({
      where: {
        id: bookingRef,
        status: "RESERVED", // Only delete reservations, never confirmed bookings
      },
    });

    if (deleted.count === 0) {
      return json({ 
        ok: false, 
        error: "Booking not found or already confirmed" 
      }, { status: 404 });
    }

    return json({ ok: true, deleted: deleted.count });

  } catch (e: any) {
    logger.error("Unreserve failed", e, { bookingRef });
    return json({ ok: false, error: "Failed to unreserve" }, { status: 500 });
  }
};
