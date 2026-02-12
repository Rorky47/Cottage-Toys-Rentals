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
  
  findByOrderId(orderId: string): Promise<Booking[]>;
  
  findExpired(now: Date): Promise<Booking[]>;
  
  save(booking: Booking): Promise<void>;
  
  saveMany(bookings: Booking[]): Promise<void>;
  
  delete(id: string): Promise<void>;
  
  deleteMany(ids: string[]): Promise<void>;
}
