import { Result } from "~/shared/kernel";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type { ConfirmBookingInput } from "../dto/ConfirmBookingInput";
import type { BookingDto } from "../dto/BookingDto";

/**
 * Use case for confirming reserved bookings (when order is paid).
 * 
 * Business rules:
 * - Find bookings by cart token (orderId = "cart:{token}")
 * - Confirm each booking with actual order ID
 * - Remove expiration
 * - Emit BookingConfirmed events
 */
export class ConfirmBookingUseCase {
  constructor(private readonly bookingRepo: IBookingRepository) {}

  async execute(input: ConfirmBookingInput): Promise<Result<BookingDto[]>> {
    const cartOrderId = `cart:${input.cartToken}`;

    // 1. Find all reserved bookings for this cart
    const bookings = await this.bookingRepo.findByOrderId(cartOrderId);

    if (bookings.length === 0) {
      return Result.fail("No bookings found for this cart token");
    }

    // 2. Confirm each booking
    const confirmedBookings: BookingDto[] = [];

    for (const booking of bookings) {
      const confirmResult = booking.confirm(input.orderId);
      if (confirmResult.isFailure) {
        return Result.fail(`Failed to confirm booking ${booking.id}: ${confirmResult.error}`);
      }

      await this.bookingRepo.save(booking);

      confirmedBookings.push({
        id: booking.id,
        rentalItemId: booking.rentalItemId,
        orderId: booking.orderId,
        startDate: booking.startDate.toISOString(),
        endDate: booking.endDate.toISOString(),
        units: booking.units,
        status: booking.status,
        fulfillmentMethod: booking.fulfillmentMethod,
        expiresAt: booking.expiresAt?.toISOString() || null,
        durationDays: booking.durationDays,
      });
    }

    return Result.ok(confirmedBookings);
  }
}
