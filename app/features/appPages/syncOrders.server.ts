import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify";
import { countRentalDays, parseDateOnlyToUtcDate } from "~/rental";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { ok: true };
};

type LineItemProperty = { name?: string; value?: string } | { key?: string; value?: string };

function getProperty(properties: LineItemProperty[] | undefined, key: string): string | null {
  if (!properties) return null;
  for (const p of properties) {
    const k = (p as any)?.name ?? (p as any)?.key;
    const v = (p as any)?.value;
    if (k === key && typeof v === "string") return v;
  }
  return null;
}

function inferFulfillmentMethod(order: any): "SHIP" | "PICKUP" | "UNKNOWN" {
  const lines = order?.shippingLines?.nodes ?? [];
  if (Array.isArray(lines) && lines.length > 0) {
    for (const sl of lines) {
      const deliveryCategory = String(sl?.deliveryCategory ?? "").toLowerCase();
      const title = String(sl?.title ?? "").toLowerCase();
      if (deliveryCategory.includes("pickup") || title.includes("pickup")) {
        return "PICKUP";
      }
    }
    return "SHIP";
  }
  return "UNKNOWN";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Fetch recent paid orders from Shopify
    const response = await admin.graphql(
      `#graphql
        query GetRecentOrders {
          orders(first: 50, query: "financial_status:paid OR financial_status:partially_paid") {
            nodes {
              id
              name
              createdAt
              currencyCode
              displayFinancialStatus
              shippingLines(first: 5) {
                nodes {
                  title
                  deliveryCategory
                }
              }
              lineItems(first: 50) {
                nodes {
                  id
                  title
                  quantity
                  variant {
                    id
                    product { id }
                  }
                  customAttributes {
                    key
                    value
                  }
                }
              }
            }
          }
        }`,
    );

    const json = await response.json();
    const orders = json?.data?.orders?.nodes ?? [];

    let confirmedCount = 0;
    let skippedCount = 0;

    for (const order of orders) {
      const orderId = String(order?.id ?? "");
      const currency = String(order?.currencyCode ?? "USD");
      const fulfillmentMethod = inferFulfillmentMethod(order);
      const lineItems = order?.lineItems?.nodes ?? [];

      for (const li of lineItems) {
        const props = li?.customAttributes ?? [];
        const rentalStart = getProperty(props, "Rental Start Date") || getProperty(props, "rental_start");
        const rentalEnd = getProperty(props, "Rental Return Date") || getProperty(props, "rental_end");
        const bookingRef = getProperty(props, "_booking_ref");

        if (!rentalStart || !rentalEnd) continue; // Not a rental

        const productGid = li?.variant?.product?.id;
        if (!productGid) continue;

        const productId = productGid.split("/").pop() || "";
        const units = Math.floor(Number(li?.quantity ?? 1));

        // Find or create rental item
        const rentalItem = await prisma.rentalItem.findUnique({
          where: { shop_shopifyProductId: { shop, shopifyProductId: productId } },
        });

        if (!rentalItem) {
          console.log(`[syncOrders] No rental item found for product ${productId}, skipping`);
          skippedCount++;
          continue;
        }

        const startDate = parseDateOnlyToUtcDate(rentalStart);
        const endDate = parseDateOnlyToUtcDate(rentalEnd);

        // Try to promote existing RESERVED booking by reference
        if (bookingRef) {
          const updated = await prisma.booking.updateMany({
            where: {
              id: bookingRef,
              rentalItemId: rentalItem.id,
              status: "RESERVED",
            },
            data: {
              orderId,
              status: "CONFIRMED",
              expiresAt: null,
              units,
              fulfillmentMethod,
            } as any,
          });

          if (updated.count > 0) {
            console.log(`[syncOrders] Promoted booking ${bookingRef} to CONFIRMED`);
            confirmedCount++;
            continue;
          }
        }

        // Check if already confirmed
        const existing = await prisma.booking.findFirst({
          where: {
            rentalItemId: rentalItem.id,
            orderId,
            startDate,
            endDate,
          },
        });

        if (existing) {
          if (existing.status === "CONFIRMED") {
            skippedCount++;
            continue; // Already confirmed
          }
          // Update existing
          await prisma.booking.update({
            where: { id: existing.id },
            data: {
              status: "CONFIRMED",
              expiresAt: null,
              units,
              fulfillmentMethod,
            } as any,
          });
          console.log(`[syncOrders] Updated existing booking ${existing.id} to CONFIRMED`);
          confirmedCount++;
        } else {
          // Create new confirmed booking
          await prisma.booking.create({
            data: {
              id: bookingRef || undefined,
              rentalItemId: rentalItem.id,
              orderId,
              startDate,
              endDate,
              units,
              status: "CONFIRMED",
              fulfillmentMethod,
              expiresAt: null,
            } as any,
          });
          console.log(`[syncOrders] Created new CONFIRMED booking for order ${orderId}`);
          confirmedCount++;
        }
      }
    }

    return {
      ok: true,
      confirmed: confirmedCount,
      skipped: skippedCount,
      total: orders.length,
    };
  } catch (e: any) {
    console.error("[syncOrders] Error:", e);
    return { ok: false, error: String(e?.message ?? e) };
  }
};
