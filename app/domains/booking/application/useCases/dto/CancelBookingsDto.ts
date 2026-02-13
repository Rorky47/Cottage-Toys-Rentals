export interface CancelBookingsByOrderIdInput {
  orderId: string;
  reason?: string;
}

export interface CancelBookingsByOrderIdOutput {
  cancelledCount: number;
  bookingIds: string[];
}

export interface CancelReservedBookingsByRentalItemInput {
  rentalItemId: string;
  reason?: string;
}

export interface CancelReservedBookingsByRentalItemOutput {
  cancelledCount: number;
  bookingIds: string[];
}
