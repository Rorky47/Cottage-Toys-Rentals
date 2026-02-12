/**
 * DTOs for UpdateBookingStatusUseCase
 */

export interface UpdateBookingStatusInput {
  shop: string;
  bookingId: string;
  status: "RESERVED" | "CONFIRMED" | "CANCELLED" | "RETURNED";
  fulfillmentMethod: "SHIP" | "PICKUP" | "UNKNOWN";
}

export interface UpdateBookingStatusOutput {
  updated: boolean;
}
