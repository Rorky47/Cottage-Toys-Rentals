import { Result } from "~/shared/kernel";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";

/**
 * Use case for cleaning up expired reservations.
 * 
 * Business rules:
 * - Find all RESERVED bookings with expired expiresAt
 * - Delete them (free up inventory)
 * - Return count of deleted bookings
 */
export class CleanupExpiredBookingsUseCase {
  constructor(private readonly bookingRepo: IBookingRepository) {}

  async execute(): Promise<Result<{ deletedCount: number }>> {
    const now = new Date();

    // 1. Find expired bookings
    const expiredBookings = await this.bookingRepo.findExpired(now);

    if (expiredBookings.length === 0) {
      return Result.ok({ deletedCount: 0 });
    }

    // 2. Delete expired bookings
    const ids = expiredBookings.map((b) => b.id);
    await this.bookingRepo.deleteMany(ids);

    return Result.ok({ deletedCount: ids.length });
  }
}
