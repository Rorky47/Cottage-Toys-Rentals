import { Result } from "~/shared/kernel/Result";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type {
  CancelBookingsByOrderIdInput,
  CancelBookingsByOrderIdOutput,
} from "./dto/CancelBookingsDto";

/**
 * Use case: Cancel all bookings for an order.
 * 
 * Called when an order is cancelled (ORDERS_CANCELLED webhook).
 * Cancels all bookings associated with the order ID, freeing up inventory.
 * 
 * Flow:
 * 1. Find all bookings by order ID
 * 2. Cancel each booking (via entity method)
 * 3. Save updated bookings
 * 4. Return count of cancelled bookings
 */
export class CancelBookingsByOrderIdUseCase {
  constructor(private bookingRepo: IBookingRepository) {}

  async execute(
    input: CancelBookingsByOrderIdInput
  ): Promise<Result<CancelBookingsByOrderIdOutput>> {
    // 1. Validate input
    if (!input.orderId || input.orderId.trim() === "") {
      return Result.fail("Order ID is required");
    }

    // 2. Find all bookings for this order
    const bookings = await this.bookingRepo.findByOrderId(input.orderId);

    if (bookings.length === 0) {
      return Result.ok({ cancelledCount: 0, bookingIds: [] });
    }

    // 3. Cancel each booking
    const cancelledBookings = [];
    for (const booking of bookings) {
      const result = booking.cancel(input.reason || "Order cancelled");
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
