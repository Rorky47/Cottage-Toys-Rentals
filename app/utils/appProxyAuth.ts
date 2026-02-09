import crypto from "crypto";

/**
 * Validates Shopify app proxy request signature.
 * See: https://shopify.dev/docs/apps/build/online-store/app-proxies#authenticate-proxied-requests
 * 
 * @param queryParams - URLSearchParams from the request
 * @param secret - SHOPIFY_API_SECRET
 * @returns true if signature is valid, false otherwise
 */
export function validateAppProxySignature(
  queryParams: URLSearchParams,
  secret: string
): boolean {
  const signature = queryParams.get("signature");
  if (!signature) return false;

  // Build parameter string (all params except 'signature', sorted alphabetically)
  const params = Array.from(queryParams.entries())
    .filter(([key]) => key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("");

  // Compute HMAC-SHA256
  const hash = crypto
    .createHmac("sha256", secret)
    .update(params)
    .digest("hex");

  // Compare in constant time to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(signature)
  );
}
