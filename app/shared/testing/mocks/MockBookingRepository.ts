import type { IBookingRepository } from "~/domains/booking/infrastructure/repositories/IBookingRepository";
import { Booking } from "~/domains/booking/domain/entities/Booking";
import type { DateRange } from "~/shared/kernel";

/**
 * Mock booking repository for testing.
 * Stores bookings in memory.
 */
export class MockBookingRepository implements IBookingRepository {
  private bookings: Map<string, Booking> = new Map();

  async findById(id: string): Promise<Booking | null> {
    return this.bookings.get(id) || null;
  }

  async findByRentalItem(rentalItemId: string, dateRange: DateRange): Promise<Booking[]> {
    const all = Array.from(this.bookings.values());
    return all.filter(
      (b) => b.rentalItemId === rentalItemId && b.overlapsWith(dateRange)
    );
  }

  async findByOrderId(orderId: string): Promise<Booking[]> {
    const all = Array.from(this.bookings.values());
    return all.filter((b) => b.orderId === orderId);
  }

  async findReservedByRentalItemId(rentalItemId: string): Promise<Booking[]> {
    const all = Array.from(this.bookings.values());
    return all.filter((b) => b.rentalItemId === rentalItemId && b.status === "RESERVED");
  }

  async findExpired(now: Date): Promise<Booking[]> {
    const all = Array.from(this.bookings.values());
    return all.filter((b) => b.isExpired(now));
  }

  async save(booking: Booking): Promise<void> {
    this.bookings.set(booking.id, booking);
  }

  async saveMany(bookings: Booking[]): Promise<void> {
    for (const booking of bookings) {
      this.bookings.set(booking.id, booking);
    }
  }

  async delete(id: string): Promise<void> {
    this.bookings.delete(id);
  }

  async deleteMany(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.bookings.delete(id);
    }
  }

  async findByRentalItemAndDateRange(
    rentalItemId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]> {
    const all = Array.from(this.bookings.values());
    return all.filter(
      (b) =>
        b.rentalItemId === rentalItemId &&
        b.startDate.getTime() === startDate.getTime() &&
        b.endDate.getTime() === endDate.getTime()
    );
  }

  async findByShopAndDateRange(
    shop: string,
    startDate: Date,
    endDate: Date,
    now: Date
  ): Promise<Array<{ booking: Booking; rentalItemName: string | null }>> {
    // Simplified mock - returns all bookings as if they belong to shop
    const all = Array.from(this.bookings.values());
    return all
      .filter((b) => b.isActive())
      .map((b) => ({ booking: b, rentalItemName: null }));
  }

  async updateStatus(
    shop: string,
    bookingId: string,
    status: Booking["status"],
    fulfillmentMethod: "SHIP" | "PICKUP" | "UNKNOWN"
  ): Promise<boolean> {
    const booking = this.bookings.get(bookingId);
    if (!booking) return false;
    
    // Mock implementation - just return true
    return true;
  }

  // Test helper methods
  clear(): void {
    this.bookings.clear();
  }

  count(): number {
    return this.bookings.size;
  }

  getAll(): Booking[] {
    return Array.from(this.bookings.values());
  }
}
