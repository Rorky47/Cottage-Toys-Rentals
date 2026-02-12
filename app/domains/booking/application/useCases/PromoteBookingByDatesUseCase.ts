import { Result } from "~/shared/kernel";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type { BookingDto } from "../dto/BookingDto";
import { BookingStatus, FulfillmentMethod } from "../../domain/entities/Booking";

interface PromoteBookingByDatesInput {
  rentalItemId: string;
  startDate: Date;
  endDate: Date;
  orderId: string;
  units: number;
  fulfillmentMethod: "SHIP" | "PICKUP" | "UNKNOWN";
}

/**
 * Use case for promoting RESERVED bookings to CONFIRMED by date range.
 * Used as fallback when no booking reference is available from cart.
 * 
 * Business rules:
 * - Find RESERVED bookings matching rental item and dates
 * - Promote the first one found
 * - Update units and fulfillment method
 */
export class PromoteBookingByDatesUseCase {
  constructor(private readonly bookingRepo: IBookingRepository) {}

  async execute(input: PromoteBookingByDatesInput): Promise<Result<BookingDto | null>> {
    // 1. Find RESERVED bookings matching dates
    const bookings = await this.bookingRepo.findByRentalItemAndDateRange(
      input.rentalItemId,
      input.startDate,
      input.endDate
    );

    const reservedBooking = bookings.find((b) => b.status === BookingStatus.RESERVED);

    if (!reservedBooking) {
      // No RESERVED booking found - return null (not an error)
      return Result.ok(null);
    }

    // 2. Update units if different
    if (input.units !== reservedBooking.units) {
      const updateResult = reservedBooking.updateUnits(input.units);
      if (updateResult.isFailure) {
        return Result.fail(updateResult.error);
      }
    }

    // 3. Update fulfillment method
    reservedBooking.updateFulfillmentMethod(input.fulfillmentMethod as FulfillmentMethod);

    // 4. Confirm booking
    const confirmResult = reservedBooking.confirm(input.orderId);
    if (confirmResult.isFailure) {
      return Result.fail(confirmResult.error);
    }

    // 5. Save changes
    await this.bookingRepo.save(reservedBooking);

    // 6. Return DTO
    return Result.ok({
      id: reservedBooking.id,
      rentalItemId: reservedBooking.rentalItemId,
      orderId: reservedBooking.orderId,
      startDate: reservedBooking.startDate.toISOString(),
      endDate: reservedBooking.endDate.toISOString(),
      units: reservedBooking.units,
      status: reservedBooking.status,
      fulfillmentMethod: reservedBooking.fulfillmentMethod,
      expiresAt: reservedBooking.expiresAt?.toISOString() || null,
      durationDays: reservedBooking.durationDays,
    });
  }
}
