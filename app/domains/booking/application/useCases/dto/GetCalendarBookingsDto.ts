/**
 * DTOs for GetCalendarBookingsUseCase
 */

export interface GetCalendarBookingsInput {
  shop: string;
  year: number;
  month: number; // 0-indexed (0 = January, 11 = December)
}

export interface CalendarBookingDto {
  id: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  units: number;
  rentalItemName: string | null;
  status: "RESERVED" | "CONFIRMED" | "CANCELLED" | "RETURNED";
  fulfillmentMethod: "SHIP" | "PICKUP" | "UNKNOWN";
  orderId: string | null;
}

export interface GetCalendarBookingsOutput {
  bookings: CalendarBookingDto[];
}
