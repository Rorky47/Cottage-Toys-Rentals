import crypto from "node:crypto";

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Verifies a Shopify App Proxy request.
 *
 * Shopify's app proxy signature differs from OAuth HMAC:
 * - Uses `signature` param (not `hmac`)
 * - Concatenates sorted key=value pairs WITHOUT '&'
 * - Excludes `signature` itself
 */
export function verifyAppProxyRequest(request: Request): { shop: string } {
  const url = new URL(request.url);
  const signature = url.searchParams.get("signature") ?? "";
  const shop = url.searchParams.get("shop") ?? "";

  if (!shop) {
    throw new Response("Missing shop", { status: 400 });
  }

  const secret = process.env.SHOPIFY_API_SECRET || "";
  if (!secret) {
    throw new Response("Server not configured", { status: 500 });
  }

  if (!signature) {
    throw new Response("Missing signature", { status: 401 });
  }

  const pairs: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => {
    if (key === "signature") return;
    pairs.push([key, value]);
  });

  pairs.sort(([a], [b]) => a.localeCompare(b));
  const message = pairs.map(([k, v]) => `${k}=${v}`).join("");

  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  if (!timingSafeEqualHex(expected, signature)) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return { shop };
}

