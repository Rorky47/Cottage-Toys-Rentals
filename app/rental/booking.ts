export const RESERVED_ORDER_PREFIX = "cart:";
export const RESERVATION_TTL_MS = 45 * 60 * 1000;

export function reservedOrderId(cartToken: string): string {
  return `${RESERVED_ORDER_PREFIX}${cartToken}`;
}

