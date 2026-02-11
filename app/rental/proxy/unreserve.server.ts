import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify";
import { logger } from "~/utils/logger";

export const unreserveAction = async ({ request }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let session: any = null;
  try {
    ({ session } = await authenticate.public.appProxy(request));
  } catch (e: any) {
    logger.error("Unreserve auth failed", e, { shop: (e as { shop?: string })?.shop });
    return json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!session) return json({ ok: false, error: "Unauthorized" }, { status: 401 });

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

  try {
    // Delete RESERVED booking by its unique ID
    const deleted = await prisma.booking.deleteMany({
      where: {
        id: bookingRef,
        status: "RESERVED", // Only delete reservations, never confirmed bookings
      },
    });

    if (deleted.count === 0) {
      return json({ ok: false, error: "Booking not found or already confirmed" }, { status: 404 });
    }

    return json({ ok: true, deleted: deleted.count });
  } catch (e: any) {
    logger.error("Unreserve failed", e, { bookingRef });
    return json({ ok: false, error: "Failed to unreserve" }, { status: 500 });
  }
};
