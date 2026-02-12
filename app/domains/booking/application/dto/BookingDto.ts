export interface BookingDto {
  id: string;
  rentalItemId: string;
  orderId: string | null;
  startDate: string;
  endDate: string;
  units: number;
  status: string;
  fulfillmentMethod: string;
  expiresAt: string | null;
  durationDays: number;
}
