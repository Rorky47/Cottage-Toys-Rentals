import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Check for existing cart transform
  const response = await admin.graphql(
    `#graphql
      query {
        cartTransform {
          id
          functionId
          metafield(namespace: "cart_transform", key: "function") {
            value
          }
        }
        shopifyFunctions(first: 20, apiType: CART_TRANSFORM) {
          nodes {
            id
            apiType
            title
            apiVersion
          }
        }
      }
    `
  );

  const data = await response.json();
  return json({
    cartTransform: data?.data?.cartTransform,
    functions: data?.data?.shopifyFunctions?.nodes ?? [],
    raw: data,
  });
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
      <h1>Enable Cart Transform Function</h1>

      <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
        <h2>Current Status:</h2>
        {loaderData.cartTransform ? (
          <div style={{ color: "green" }}>
            ✅ <strong>Cart Transform is ENABLED</strong>
            <br />
            Function ID: {loaderData.cartTransform.functionId}
          </div>
        ) : (
          <div style={{ color: "red" }}>
            ❌ <strong>Cart Transform is NOT ENABLED</strong>
            <br />
            This is why pricing isn't being calculated in the cart!
          </div>
        )}
      </div>

      <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
        <h2>Available Functions:</h2>
        {loaderData.functions.length === 0 ? (
          <p style={{ color: "orange" }}>
            ⚠️ No cart transform functions found. This means the function wasn't deployed properly.
          </p>
        ) : (
          <ul>
            {loaderData.functions.map((fn: any) => (
              <li key={fn.id} style={{ marginBottom: "10px" }}>
                <strong>{fn.title}</strong>
                <br />
                <small>ID: {fn.id}</small>
                <br />
                <small>API Type: {fn.apiType}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cartTransformFunction && !loaderData.cartTransform && (
        <div style={{ marginBottom: "30px" }}>
          <h2>Enable the Function:</h2>
          <Form method="post">
            <input type="hidden" name="functionId" value={cartTransformFunction.id} />
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                fontSize: "16px",
                backgroundColor: "#008060",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              ✅ Enable Cart Transform Function
            </button>
          </Form>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
            This will activate "{cartTransformFunction.title}" for your store
          </p>
        </div>
      )}

      {actionData && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "8px",
            backgroundColor: actionData.success ? "#e7f5ec" : "#fef1f1",
            border: `2px solid ${actionData.success ? "#008060" : "#d72c0d"}`,
          }}
        >
          {actionData.success ? (
            <div style={{ color: "#008060" }}>
              <strong>✅ Success!</strong>
              <p>Cart transform function is now enabled. Test your checkout - prices should now be calculated correctly!</p>
            </div>
          ) : (
            <div style={{ color: "#d72c0d" }}>
              <strong>❌ Error:</strong>
              <p>{actionData.error}</p>
              {actionData.raw && (
                <details>
                  <summary>Raw response</summary>
                  <pre style={{ fontSize: "12px", overflow: "auto" }}>
                    {JSON.stringify(actionData.raw, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "40px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px" }}>
        <h3>⚠️ If No Functions Are Listed Above:</h3>
        <p>The cart transform function might not be deployed. Try running:</p>
        <pre style={{ backgroundColor: "#000", color: "#0f0", padding: "10px", borderRadius: "4px" }}>
          cd ~/Documents/Programming/Cottage-Toys-Rentals
          <br />
          shopify app deploy -c rentalrates --force
        </pre>
      </div>

      <details style={{ marginTop: "20px" }}>
        <summary>Raw API Response (Debug)</summary>
        <pre style={{ fontSize: "12px", overflow: "auto", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
          {JSON.stringify(loaderData.raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
