import type { Booking } from "~/domains/booking/domain/entities/Booking";
import type { DateRange, Result } from "~/shared/kernel";

/**
 * Repository interface for Booking aggregate.
 * Defines data access contract without implementation details.
 */
export interface IBookingRepository {
  findById(id: string): Promise<Booking | null>;
  
  findByRentalItem(
    rentalItemId: string,
    dateRange: DateRange
  ): Promise<Booking[]>;
  
  findByRentalItemAndDateRange(
    rentalItemId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]>;
  
  findByOrderId(orderId: string): Promise<Booking[]>;
  
  findExpired(now: Date): Promise<Booking[]>;

  findByShopAndDateRange(
    shop: string,
    startDate: Date,
    endDate: Date,
    now: Date
  ): Promise<Array<{
    booking: Booking;
    rentalItemName: string | null;
  }>>;

  updateStatus(
    shop: string,
    bookingId: string,
    status: Booking["status"],
    fulfillmentMethod: "SHIP" | "PICKUP" | "UNKNOWN"
  ): Promise<boolean>;
  
  save(booking: Booking): Promise<void>;
  
  saveMany(bookings: Booking[]): Promise<void>;
  
  delete(id: string): Promise<void>;
  
  deleteMany(ids: string[]): Promise<void>;
}
