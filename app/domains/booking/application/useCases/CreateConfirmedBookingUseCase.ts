import { Result } from "~/shared/kernel";
import { Booking, BookingStatus, FulfillmentMethod } from "../../domain/entities/Booking";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type { BookingDto } from "../dto/BookingDto";
import { randomBytes } from "crypto";

interface CreateConfirmedBookingInput {
  rentalItemId: string;
  orderId: string;
  startDate: Date;
  endDate: Date;
  units: number;
  fulfillmentMethod: "SHIP" | "PICKUP" | "UNKNOWN";
}

/**
 * Use case for creating a CONFIRMED booking directly (without reservation).
 * Used by webhooks when order is already paid.
 * 
 * Business rules:
 * - Create booking in CONFIRMED status
 * - No expiration (already paid)
 * - Does NOT check availability (assumes order already went through)
 */
export class CreateConfirmedBookingUseCase {
  constructor(private readonly bookingRepo: IBookingRepository) {}

  async execute(input: CreateConfirmedBookingInput): Promise<Result<BookingDto>> {
    // Create booking entity directly in CONFIRMED status
    const bookingResult = Booking.create({
      id: this.generateId(),
      rentalItemId: input.rentalItemId,
      orderId: input.orderId,
      startDate: input.startDate,
      endDate: input.endDate,
      units: input.units,
      status: BookingStatus.CONFIRMED,
      fulfillmentMethod: input.fulfillmentMethod as FulfillmentMethod,
      expiresAt: null,
    });

    if (bookingResult.isFailure) {
      return Result.fail(bookingResult.error);
    }

    const booking = bookingResult.value;

    // Save to database
    await this.bookingRepo.save(booking);

    // Return DTO
    return Result.ok(this.toDto(booking));
  }

  private generateId(): string {
    return randomBytes(16).toString("hex");
  }

  private toDto(booking: Booking): BookingDto {
    return {
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
    };
  }
}
