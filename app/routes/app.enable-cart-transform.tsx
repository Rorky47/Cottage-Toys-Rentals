import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Just query for functions - simpler approach
    const response = await admin.graphql(
      `#graphql
        query {
          shopifyFunctions(first: 20, apiType: CART_TRANSFORM) {
            nodes {
              id
              apiType
              title
              apiVersion
              app {
                title
              }
            }
          }
        }
      `
    );

    const data = await response.json();
    return json({
      functions: data?.data?.shopifyFunctions?.nodes ?? [],
      error: null,
      raw: data,
    });
  } catch (error: any) {
    return json({
      functions: [],
      error: error.message ?? String(error),
      raw: null,
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const functionId = formData.get("functionId");

  if (!functionId) {
    return json({ error: "No function ID provided" }, { status: 400 });
  }

  try {
    // Enable the cart transform
    const response = await admin.graphql(
      `#graphql
        mutation cartTransformCreate($functionId: String!) {
          cartTransformCreate(functionId: $functionId) {
            cartTransform {
              id
              functionId
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          functionId: String(functionId),
        },
      }
    );

    const data = await response.json();
    const userErrors = data?.data?.cartTransformCreate?.userErrors ?? [];

    if (userErrors.length > 0) {
      return json({ error: userErrors[0].message, raw: data });
    }

    return json({ success: true, data: data?.data?.cartTransformCreate });
  } catch (error: any) {
    return json({ error: error.message ?? String(error) }, { status: 500 });
  }
};

export default function EnableCartTransform() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const cartTransformFunction = loaderData.functions.find((f: any) => 
    f.title?.toLowerCase().includes("cart") || 
    f.title?.toLowerCase().includes("multiplier")
  );

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Cart Transform Function Status</h1>

      {loaderData.error && (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px", border: "2px solid #ffc107" }}>
          <strong>⚠️ API Error:</strong>
          <p>{loaderData.error}</p>
        </div>
      )}

      <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
        <h2>Available Cart Transform Functions:</h2>
        {loaderData.functions.length === 0 ? (
          <div>
            <p style={{ color: "red" }}>
              ❌ <strong>No cart transform functions found</strong>
            </p>
            <p>This means the function wasn't deployed to Shopify or wasn't recognized.</p>
          </div>
        ) : (
          <ul>
            {loaderData.functions.map((fn: any) => (
              <li key={fn.id} style={{ marginBottom: "10px" }}>
                <strong>{fn.title}</strong> ({fn.app?.title})
                <br />
                <small>ID: {fn.id}</small>
                <br />
                <small>API Version: {fn.apiVersion}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loaderData.functions.length === 0 && (
        <div style={{ padding: "20px", backgroundColor: "#fef1f1", borderRadius: "8px", border: "2px solid #d72c0d" }}>
          <h3>❌ Problem: Function Not Deployed</h3>
          <p>The cart transform function needs to be deployed to Shopify. It should have been deployed when you ran <code>shopify app deploy</code>.</p>
          
          <h4>Possible Issues:</h4>
          <ol>
            <li><strong>Function build failed</strong> - Check if the .wasm file exists at <code>extensions/cart-multiplier-function/dist/index.wasm</code></li>
            <li><strong>Deployment didn't include the function</strong> - The function might have been skipped during deploy</li>
            <li><strong>App doesn't have function permissions</strong> - The app needs proper scopes</li>
          </ol>

          <h4>Manual Activation Steps:</h4>
          <p>Since the automated deployment isn't working, you need to manually enable it:</p>
          <ol>
            <li>Go to Shopify Admin → Settings → Checkout</li>
            <li>Look for "Customizations" section</li>
            <li>Under "Cart and checkout validations", click "Add customization"</li>
            <li>Select your app's cart transform function</li>
            <li>Enable it</li>
          </ol>

          <p><strong>OR check your Shopify Partner Dashboard:</strong></p>
          <ul>
            <li>Go to: <a href="https://partners.shopify.com/129136928/apps/321275789313" target="_blank">Partner Dashboard</a></li>
            <li>Look for Extensions/Functions tab</li>
            <li>See if "Cart price multiplier" is listed</li>
            <li>Click to view/enable it</li>
          </ul>
        </div>
      )}

      {cartTransformFunction && (
        <div style={{ marginBottom: "30px", padding: "20px", backgroundColor: "#e7f5ec", borderRadius: "8px", border: "2px solid #008060" }}>
          <h3>✅ Cart Transform Function Found!</h3>
          <p><strong>{cartTransformFunction.title}</strong> is deployed to Shopify.</p>
          
          <h4>Next Step: Enable it in Shopify Admin</h4>
          <ol>
            <li>Go to: <a href="https://cottage-toys-canada.myshopify.com/admin/settings/checkout" target="_blank">Settings → Checkout</a></li>
            <li>Scroll to find the customizations section</li>
            <li>Look for "{cartTransformFunction.title}" or cart validation options</li>
            <li>Enable/activate it</li>
          </ol>
          
          <p style={{ marginTop: "15px", padding: "10px", backgroundColor: "#fff", borderRadius: "4px" }}>
            <strong>Note:</strong> The GraphQL API we're using doesn't support automatically enabling cart transforms via code. 
            You must enable it through the Shopify Admin UI.
          </p>
        </div>
      )}

      <details style={{ marginTop: "20px" }}>
        <summary>Raw API Response (Debug)</summary>
        <pre style={{ fontSize: "12px", overflow: "auto", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
          {JSON.stringify(loaderData.raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
