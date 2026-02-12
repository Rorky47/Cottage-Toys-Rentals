import { Result } from "~/shared/kernel";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type { BookingDto } from "../dto/BookingDto";
import { FulfillmentMethod } from "../../domain/entities/Booking";

interface ConfirmBookingByIdInput {
  bookingId: string;
  orderId: string;
  units?: number;
  fulfillmentMethod?: "SHIP" | "PICKUP" | "UNKNOWN";
}

/**
 * Use case for confirming a specific booking by its ID.
 * Used by ordersPaid webhook when booking reference is known.
 * 
 * Business rules:
 * - Find booking by exact ID
 * - Confirm booking with order ID
 * - Optionally update units and fulfillment method
 */
export class ConfirmBookingByIdUseCase {
  constructor(private readonly bookingRepo: IBookingRepository) {}

  async execute(input: ConfirmBookingByIdInput): Promise<Result<BookingDto>> {
    // 1. Find booking by ID
    const booking = await this.bookingRepo.findById(input.bookingId);

    if (!booking) {
      return Result.fail(`Booking ${input.bookingId} not found`);
    }

    // 2. Update units if provided
    if (input.units !== undefined && input.units !== booking.units) {
      const updateResult = booking.updateUnits(input.units);
      if (updateResult.isFailure) {
        return Result.fail(updateResult.error);
      }
    }

    // 3. Update fulfillment method if provided
    if (input.fulfillmentMethod !== undefined) {
      booking.updateFulfillmentMethod(input.fulfillmentMethod as FulfillmentMethod);
    }

    // 4. Confirm booking
    const confirmResult = booking.confirm(input.orderId);
    if (confirmResult.isFailure) {
      return Result.fail(confirmResult.error);
    }

    // 5. Save changes
    await this.bookingRepo.save(booking);

    // 6. Return DTO
    return Result.ok({
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
}
