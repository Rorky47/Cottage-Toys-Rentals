import { Result } from "~/shared/kernel";
import { Booking, FulfillmentMethod } from "../../domain/entities/Booking";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type { CreateBookingInput } from "../dto/CreateBookingInput";
import type { BookingDto } from "../dto/BookingDto";
import { CheckAvailabilityUseCase } from "./CheckAvailabilityUseCase";
import type { IRentalItemRepository } from "~/domains/rental/infrastructure/repositories/IRentalItemRepository";
import { randomBytes } from "crypto";

/**
 * Use case for creating a new booking (reservation).
 * 
 * Business rules:
 * - Check availability before creating booking
 * - Generate unique booking ID
 * - Create as RESERVED status with expiration
 * - Emit BookingCreated event
 */
export class CreateBookingUseCase {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly rentalItemRepo: IRentalItemRepository
  ) {}

  async execute(input: CreateBookingInput): Promise<Result<BookingDto>> {
    // 1. Check availability first
    const availabilityUseCase = new CheckAvailabilityUseCase(
      this.bookingRepo,
      this.rentalItemRepo
    );

    const availabilityResult = await availabilityUseCase.execute({
      rentalItemId: input.rentalItemId,
      startDate: input.startDate,
      endDate: input.endDate,
      requestedUnits: input.units,
    });

    if (availabilityResult.isFailure) {
      return Result.fail(availabilityResult.error);
    }

    if (!availabilityResult.value.available) {
      return Result.fail(
        `Not enough units available. Requested: ${input.units}, Available: ${availabilityResult.value.availableUnits}`
      );
    }

    // 2. Create booking entity
    const bookingResult = Booking.createReservation({
      id: this.generateId(),
      rentalItemId: input.rentalItemId,
      cartToken: input.cartToken,
      startDate: input.startDate,
      endDate: input.endDate,
      units: input.units,
      fulfillmentMethod: input.fulfillmentMethod as FulfillmentMethod,
      ttlMs: input.ttlMs,
    });

    if (bookingResult.isFailure) {
      return Result.fail(bookingResult.error);
    }

    const booking = bookingResult.value;

    // 3. Save to database
    await this.bookingRepo.save(booking);

    // 4. Return DTO
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
