import { Result } from "~/shared/kernel/Result";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type {
  CancelReservedBookingsByRentalItemInput,
  CancelReservedBookingsByRentalItemOutput,
} from "./dto/CancelBookingsDto";

/**
 * Use case: Cancel all RESERVED bookings for a rental item.
 * 
 * Called when a Shopify product is deleted (PRODUCTS_DELETE webhook).
 * Cancels only RESERVED bookings, keeps CONFIRMED bookings for merchant to handle manually.
 * 
 * Flow:
 * 1. Find all RESERVED bookings for rental item
 * 2. Cancel each booking (via entity method)
 * 3. Save updated bookings
 * 4. Return count of cancelled bookings
 */
export class CancelReservedBookingsByRentalItemUseCase {
  constructor(private bookingRepo: IBookingRepository) {}

  async execute(
    input: CancelReservedBookingsByRentalItemInput
  ): Promise<Result<CancelReservedBookingsByRentalItemOutput>> {
    // 1. Validate input
    if (!input.rentalItemId || input.rentalItemId.trim() === "") {
      return Result.fail("Rental item ID is required");
    }

    // 2. Find all RESERVED bookings for this rental item
    const bookings = await this.bookingRepo.findReservedByRentalItemId(
      input.rentalItemId
    );

    if (bookings.length === 0) {
      return Result.ok({ cancelledCount: 0, bookingIds: [] });
    }

    // 3. Cancel each booking
    const cancelledBookings = [];
    for (const booking of bookings) {
      const result = booking.cancel(input.reason || "Product deleted");
      if (result.isSuccess) {
        cancelledBookings.push(booking);
      }
      // Skip already cancelled/failed bookings
    }

    // 4. Save updated bookings
    if (cancelledBookings.length > 0) {
      await this.bookingRepo.saveMany(cancelledBookings);
    }

    return Result.ok({
      cancelledCount: cancelledBookings.length,
      bookingIds: cancelledBookings.map((b) => b.id),
    });
  }
}
