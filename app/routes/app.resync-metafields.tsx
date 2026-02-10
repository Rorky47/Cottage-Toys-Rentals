import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { authenticate } from "~/shopify";
import prisma from "~/db.server";
import { syncRentalPricingMetafieldForProduct } from "~/rental";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  const rentalItems = await prisma.rentalItem.findMany({
    where: { shop: session.shop },
    include: { rateTiers: { orderBy: { minDays: "asc" } } },
  });

  const results: Array<{ productId: string; name: string; success: boolean; error?: string }> = [];

  for (const item of rentalItems) {
    try {
      await syncRentalPricingMetafieldForProduct({
        admin,
        shopifyProductId: item.shopifyProductId,
        basePricePerDayCents: item.basePricePerDayCents,
        tiers: item.rateTiers.map((t) => ({
          minDays: t.minDays,
          pricePerDayCents: t.pricePerDayCents,
        })),
      });
      results.push({
        productId: item.shopifyProductId,
        name: item.name ?? "Unknown",
        success: true,
      });
    } catch (e: any) {
      results.push({
        productId: item.shopifyProductId,
        name: item.name ?? "Unknown",
        success: false,
        error: e?.message ?? String(e),
      });
    }
  }

  return json({ results, total: rentalItems.length });
};

export default function ResyncMetafields() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Resync Rental Pricing Metafields</h1>
      <p>
        This will update the <code>cottage_rentals.pricing</code> metafield for all rental products.
        This metafield is required for the cart transform function to calculate rental pricing.
      </p>

      <Form method="post">
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: isSubmitting ? "#ccc" : "#008060",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isSubmitting ? "not-allowed" : "pointer",
          }}
        >
          {isSubmitting ? "Resyncing..." : "Resync All Metafields"}
        </button>
      </Form>

      {actionData && (
        <div style={{ marginTop: "20px" }}>
          <h2>Results</h2>
          <p>
            Total products: {actionData.total} |{" "}
            Success: {actionData.results.filter((r) => r.success).length} |{" "}
            Failed: {actionData.results.filter((r) => !r.success).length}
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {actionData.results.map((result, i) => (
              <li
                key={i}
                style={{
                  padding: "10px",
                  marginBottom: "5px",
                  backgroundColor: result.success ? "#e7f5ec" : "#fef1f1",
                  borderLeft: `4px solid ${result.success ? "#008060" : "#d72c0d"}`,
                }}
              >
                <strong>{result.name}</strong> ({result.productId})
                {result.success ? (
                  <span style={{ color: "#008060", marginLeft: "10px" }}>✓ Synced</span>
                ) : (
                  <span style={{ color: "#d72c0d", marginLeft: "10px" }}>
                    ✗ Failed: {result.error}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
