import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Query for cart transform functions
  const response = await admin.graphql(
    `#graphql
      query {
        shopifyFunctions(first: 10) {
          nodes {
            id
            apiType
            title
            appTitle
            appBridge {
              detailsPath
            }
          }
        }
      }
    `
  );

  const data = await response.json();
  const functions = data?.data?.shopifyFunctions?.nodes ?? [];

  return json({ functions });
};

export default function DiagnoseFunction() {
  const { functions } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Cart Transform Function Diagnostic</h1>
      
      <h2>Functions Found:</h2>
      {functions.length === 0 ? (
        <p style={{ color: "red" }}>
          ❌ No functions found. The cart transform might not be deployed correctly.
        </p>
      ) : (
        <ul>
          {functions.map((fn: any) => (
            <li key={fn.id} style={{ marginBottom: "10px" }}>
              <strong>{fn.title}</strong> ({fn.apiType})
              <br />
              <small>App: {fn.appTitle}</small>
              <br />
              ID: {fn.id}
            </li>
          ))}
        </ul>
      )}

      <h2>Next Steps:</h2>
      <div style={{ backgroundColor: "#f9f9f9", padding: "15px", borderRadius: "8px" }}>
        <h3>If no cart transform function is shown above:</h3>
        <ol>
          <li>
            Go to Shopify Partner Dashboard:{" "}
            <a
              href="https://partners.shopify.com/129136928/apps/321275789313/edit"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://partners.shopify.com/129136928/apps/321275789313/edit
            </a>
          </li>
          <li>Look for "Extensions" or "Functions" section</li>
          <li>Find "Cart price multiplier" function</li>
          <li>Enable/Activate it for production</li>
        </ol>

        <h3>Alternative: Enable via Shopify Admin</h3>
        <ol>
          <li>Go to: Shopify Admin → Settings → Checkout</li>
          <li>Scroll to "Cart and checkout validations" or similar section</li>
          <li>Look for "Cart price multiplier" or similar cart transform</li>
          <li>Click to enable it</li>
        </ol>

        <h3>Technical Details:</h3>
        <p>
          The cart transform function is defined in{" "}
          <code>extensions/cart-multiplier-function</code> and should:
        </p>
        <ul>
          <li>Read rental_days, rental_start, rental_end attributes from cart lines</li>
          <li>Read cottage_rentals.pricing metafield from products</li>
          <li>Calculate: base_price_per_day × rental_days</li>
          <li>Apply tiered pricing if configured</li>
        </ul>
      </div>
    </div>
  );
}
