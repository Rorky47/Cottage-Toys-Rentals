import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useSubmit } from "@remix-run/react";
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
    // Enable the cart transform using the correct mutation
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
      return json({ success: false, error: userErrors[0].message, raw: data });
    }

    const cartTransform = data?.data?.cartTransformCreate?.cartTransform;
    if (!cartTransform) {
      return json({ success: false, error: "Failed to create cart transform", raw: data });
    }

    return json({ success: true, cartTransform, message: "Cart transform function is now active!" });
  } catch (error: any) {
    return json({ success: false, error: error.message ?? String(error) }, { status: 500 });
  }
};

export default function EnableCartTransform() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const cartTransformFunction = loaderData.functions.find((f: any) => 
    f.title?.toLowerCase().includes("cart") || 
    f.title?.toLowerCase().includes("multiplier")
  );

  const handleActivate = () => {
    if (!cartTransformFunction) return;
    
    const formData = new FormData();
    formData.append("functionId", cartTransformFunction.id);
    submit(formData, { method: "post" });
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>Cart Transform Function Activation</h1>

      {loaderData.error && (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#fff3cd", borderRadius: "8px", border: "2px solid #ffc107" }}>
          <strong>⚠️ API Error:</strong>
          <p>{loaderData.error}</p>
        </div>
      )}

      {actionData?.success && (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#d4edda", borderRadius: "8px", border: "2px solid #28a745" }}>
          <strong>✅ Success!</strong>
          <p>{actionData.message}</p>
          {actionData.cartTransform?.id && (
            <p><small>Cart Transform ID: {actionData.cartTransform.id}</small></p>
          )}
        </div>
      )}

      {actionData?.error && (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f8d7da", borderRadius: "8px", border: "2px solid #dc3545" }}>
          <strong>❌ Error:</strong>
          <p>{actionData.error}</p>
        </div>
      )}

      <div style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
        <h2>Available Cart Transform Functions:</h2>
        {loaderData.functions.length === 0 ? (
          <div>
            <p style={{ color: "red" }}>
              ❌ <strong>No cart transform functions found</strong>
            </p>
            <p>Run <code>shopify app deploy</code> to deploy the function first.</p>
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

      {cartTransformFunction && !actionData?.success && (
        <div style={{ marginBottom: "30px", padding: "20px", backgroundColor: "#e7f5ec", borderRadius: "8px", border: "2px solid #008060" }}>
          <h3>✅ Cart Transform Function Found!</h3>
          <p><strong>{cartTransformFunction.title}</strong> is deployed.</p>
          
          <button 
            onClick={handleActivate}
            style={{
              marginTop: "15px",
              padding: "12px 24px",
              backgroundColor: "#008060",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            🚀 Activate Cart Transform Function
          </button>

          <p style={{ marginTop: "15px", fontSize: "14px", color: "#666" }}>
            This will call the <code>cartTransformCreate</code> GraphQL mutation to enable the function.
          </p>
        </div>
      )}

      <details style={{ marginTop: "20px" }}>
        <summary>Raw API Response (Debug)</summary>
        <pre style={{ fontSize: "12px", overflow: "auto", backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px" }}>
          {JSON.stringify({ loader: loaderData.raw, action: actionData }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
