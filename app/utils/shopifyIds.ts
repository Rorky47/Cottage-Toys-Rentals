// Small, shared helpers for dealing with Shopify IDs and admin deep links.

export function normalizeShopifyProductId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept either numeric IDs or gid://shopify/Product/<id>
  const m = trimmed.match(/gid:\/\/shopify\/Product\/(\d+)/i);
  if (m?.[1]) return m[1];

  const digits = trimmed.match(/^\d+$/);
  if (digits) return trimmed;

  return null;
}

export function orderGidToAdminUrl(orderGid: string | null): string | null {
  if (!orderGid) return null;
  const m = /gid:\/\/shopify\/Order\/(\d+)/.exec(orderGid);
  if (!m?.[1]) return null;
  return `shopify:admin/orders/${m[1]}`;
}

