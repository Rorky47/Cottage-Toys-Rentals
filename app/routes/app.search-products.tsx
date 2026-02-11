import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";

  if (!query || query.length < 2) {
    return json({ products: [] });
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query SearchProducts($query: String!) {
          products(first: 10, query: $query) {
            edges {
              node {
                id
                title
                featuredImage {
                  url
                }
              }
            }
          }
        }`,
      { variables: { query } }
    );

    const data = await response.json();
    const products = data?.data?.products?.edges.map((edge: any) => ({
      id: edge.node.id,
      title: edge.node.title,
      image: edge.node.featuredImage?.url,
    })) || [];

    return json({ products });
  } catch (error) {
    console.error("Product search error:", error);
    return json({ products: [], error: "Search failed" });
  }
};
