/**
 * @deprecated This file is part of the old architecture and will be removed in Week 5.
 * 
 * **Use instead**: `Booking` entity from `~/domains/booking/domain/entities/Booking`
 * 
 * **Migration notes**:
 * - Constants (RESERVED_ORDER_PREFIX, RESERVATION_TTL_MS) moved to Booking entity
 * - Helper functions moved to Booking static methods
 * 
 * **New approach**:
 * ```typescript
 * // Old:
 * import { reservedOrderId, RESERVATION_TTL_MS } from "~/rental/booking";
 * const orderId = reservedOrderId(cartToken);
 * 
 * // New:
 * import { Booking } from "~/domains/booking/domain/entities/Booking";
 * // Constants and helpers are now in the entity
 * ```
 */

export const RESERVED_ORDER_PREFIX = "cart:";
export const RESERVATION_TTL_MS = 45 * 60 * 1000;

/** @deprecated Use Booking entity static methods */
export function reservedOrderId(cartToken: string): string {
  return `${RESERVED_ORDER_PREFIX}${cartToken}`;
}

