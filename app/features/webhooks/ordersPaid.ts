import type { ActionFunctionArgs } from "@remix-run/node";
import prisma from "~/db.server";
import { authenticate } from "~/shopify";
import { countRentalDays, parseDateOnlyToUtcDate, reservedOrderId } from "~/rental";

type LineItemProperty =
  | { name?: string; value?: string }
  | { key?: string; value?: string };

function getProperty(properties: LineItemProperty[] | undefined, key: string): string | null {
  if (!properties) return null;
  for (const p of properties) {
    const k = (p as any)?.name ?? (p as any)?.key;
    const v = (p as any)?.value;
    if (k === key && typeof v === "string") return v;
  }
  return null;
}

type RentalLineKey = string;
function makeRentalLineKey(productId: string, start: string, end: string): RentalLineKey {
  return `${productId}|${start}|${end}`;
}

function inferFulfillmentMethodFromOrder(order: any): "SHIP" | "PICKUP" | "UNKNOWN" {
  const lines = order?.shipping_lines ?? order?.shippingLines ?? null;
  if (Array.isArray(lines) && lines.length > 0) {
    for (const sl of lines) {
      const deliveryCategory = String(sl?.delivery_category ?? sl?.deliveryCategory ?? "").toLowerCase();
      const title = String(sl?.title ?? "").toLowerCase();
      const code = String(sl?.code ?? "").toLowerCase();
      if (deliveryCategory.includes("pickup") || title.includes("pickup") || code.includes("pickup")) {
        return "PICKUP";
      }
    }
    // Has a shipping line but none indicate pickup → treat as shipped/delivered.
    return "SHIP";
  }

  return "UNKNOWN";
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const order = payload as any;
    const orderId = String(order?.id ?? order?.admin_graphql_api_id ?? "");
    const currency = String(order?.currency ?? "USD");
    const fulfillmentMethod = inferFulfillmentMethodFromOrder(order);
    const cartToken = String(
      order?.cart_token ?? order?.cartToken ?? order?.checkout_token ?? order?.checkoutToken ?? "",
    );

    const lineItems = (order?.line_items as any[]) ?? [];

    // Aggregate quantity by (productId, start, end) so we confirm the right units even if checkout
    // has multiple lines for the same rental range.
    const aggregated = new Map<
      RentalLineKey,
      {
        productId: string;
        start: string;
        end: string;
        units: number;
        title: string | null;
        unitPriceStr: string | null;
        cartToken: string | null;
      }
    >();

    for (const li of lineItems) {
      const props = (li?.properties as LineItemProperty[]) ?? undefined;
      const rentalStart = getProperty(props, "rental_start");
      const rentalEnd = getProperty(props, "rental_end");
      const lineCartToken = getProperty(props, "cottage_cart_token") ?? null;

      if (!rentalStart || !rentalEnd) continue; // not a rental line

      const productId = li?.product_id;
      if (!productId) continue;

      const units = Math.floor(Number(li?.quantity ?? 1));
      if (!Number.isFinite(units) || units <= 0) continue;

      const key = makeRentalLineKey(String(productId), rentalStart, rentalEnd);
      const prev = aggregated.get(key);
      aggregated.set(key, {
        productId: String(productId),
        start: rentalStart,
        end: rentalEnd,
        units: (prev?.units ?? 0) + units,
        title: prev?.title ?? (typeof li?.title === "string" ? li.title : null),
        unitPriceStr: prev?.unitPriceStr ?? (li?.price != null ? String(li.price) : null),
        cartToken: prev?.cartToken ?? lineCartToken ?? (cartToken ? cartToken : null),
      });
    }

  for (const entry of aggregated.values()) {
    let rentalDays = 0;
    try {
      rentalDays = countRentalDays(entry.start, entry.end);
    } catch {
      continue;
    }

    const unitTotalStr = entry.unitPriceStr ?? "0";
    const unitTotalCents = Math.round(Number(unitTotalStr) * 100);
    const basePerDayCents = rentalDays > 0 ? Math.round(unitTotalCents / rentalDays) : 0;

    const rentalItem = await prisma.rentalItem.upsert({
      where: {
        shop_shopifyProductId: { shop, shopifyProductId: entry.productId },
      },
      create: {
        shop,
        shopifyProductId: entry.productId,
        name: entry.title,
        imageUrl: null,
        currencyCode: currency,
        basePricePerDayCents: basePerDayCents,
        quantity: 1,
      },
      update: {
        name: entry.title ?? undefined,
        currencyCode: currency,
        basePricePerDayCents: basePerDayCents,
      },
    });

    const startDate = parseDateOnlyToUtcDate(entry.start);
    const endDate = parseDateOnlyToUtcDate(entry.end);

    // Promote existing RESERVED hold (cart:<token>) into CONFIRMED so the same bar updates.
    const reservedId = entry.cartToken ? reservedOrderId(entry.cartToken) : null;
    if (reservedId) {
      const updated = await prisma.booking.updateMany({
        where: {
          rentalItemId: rentalItem.id,
          orderId: reservedId,
          startDate,
          endDate,
          status: "RESERVED",
        },
        data: {
          orderId,
          status: "CONFIRMED",
          expiresAt: null,
          units: entry.units,
          fulfillmentMethod,
        } as any,
      });
      if (updated.count > 0) continue;
    }

    const existing = await prisma.booking.findFirst({
      where: {
        rentalItemId: rentalItem.id,
        orderId,
        startDate,
        endDate,
      },
      select: { id: true },
    });
    if (existing) continue;

    await prisma.booking.create({
      data: {
        rentalItemId: rentalItem.id,
        orderId,
        startDate,
        endDate,
        units: entry.units,
        status: "CONFIRMED",
        fulfillmentMethod,
      } as any,
    });
  }

  return new Response(null, { status: 200 });
} catch (error) {
  console.error(`[webhook] ORDERS_PAID failed for ${(error as any)?.shop ?? "unknown"}:`, error);
  // Return 500 so Shopify will retry the webhook
  return new Response("Internal Server Error", { status: 500 });
}
};

