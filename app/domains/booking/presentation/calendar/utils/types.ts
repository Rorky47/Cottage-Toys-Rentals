export const BOOKING_STATUS_VALUES = ["RESERVED", "CONFIRMED", "CANCELLED", "RETURNED"] as const;
export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];

export const FULFILLMENT_METHOD_VALUES = ["UNKNOWN", "SHIP", "PICKUP"] as const;
export type FulfillmentMethod = (typeof FULFILLMENT_METHOD_VALUES)[number];

export function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUS_VALUES as readonly string[]).includes(value);
}

export function isFulfillmentMethod(value: string): value is FulfillmentMethod {
  return (FULFILLMENT_METHOD_VALUES as readonly string[]).includes(value);
}

export type BookingRow = {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (end-exclusive)
  units: number;
  rentalItemName: string | null;
  status: BookingStatus;
  fulfillmentMethod: FulfillmentMethod;
  orderId: string | null; // Shopify order GID
};

export type WeekCell = {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  inMonth: boolean;
};

export type Segment = {
  id: string;
  bookingId: string;
  colStart: number; // 0-6
  colSpan: number; // 1-7
  lane: number; // 0+
  status: BookingStatus;
  fulfillmentMethod: FulfillmentMethod;
  label: string;
  title: string;
  orderUrl: string | null;
};

