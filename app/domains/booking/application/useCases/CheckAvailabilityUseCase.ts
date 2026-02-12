import { Result, DateRange } from "~/shared/kernel";
import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import type { IRentalItemRepository } from "~/domains/rental/infrastructure/repositories/IRentalItemRepository";
import type { CheckAvailabilityInput } from "../dto/CheckAvailabilityInput";
import type { CheckAvailabilityOutput } from "../dto/CheckAvailabilityOutput";

/**
 * Use case for checking rental item availability.
 * 
 * Business rules:
 * - CONFIRMED bookings block availability
 * - RESERVED bookings that haven't expired block availability
 * - CANCELLED and RETURNED bookings do not block availability
 * - Available units = total quantity - used units
 */
export class CheckAvailabilityUseCase {
  constructor(
    private readonly bookingRepo: IBookingRepository,
    private readonly rentalItemRepo: IRentalItemRepository
  ) {}

  async execute(input: CheckAvailabilityInput): Promise<Result<CheckAvailabilityOutput>> {
    // 1. Create date range
    const dateRangeResult = DateRange.create(input.startDate, input.endDate);
    if (dateRangeResult.isFailure) {
      return Result.fail(dateRangeResult.error);
    }
    const dateRange = dateRangeResult.value;

    // 2. Get rental item
    const rentalItem = await this.rentalItemRepo.findById(input.rentalItemId);
    if (!rentalItem) {
      return Result.fail("Rental item not found");
    }

    // 3. Get overlapping bookings
    const overlappingBookings = await this.bookingRepo.findByRentalItem(
      input.rentalItemId,
      dateRange
    );

    // 4. Calculate used units (only active bookings)
    const activeBookings = overlappingBookings.filter((booking) => 
      booking.overlapsWith(dateRange)
    );
    
    const usedUnits = activeBookings.reduce((sum, booking) => sum + booking.units, 0);
    const availableUnits = rentalItem.quantity - usedUnits;
    const isAvailable = availableUnits >= input.requestedUnits;

    // 5. Return result
    const output: CheckAvailabilityOutput = {
      available: isAvailable,
      requestedUnits: input.requestedUnits,
      availableUnits: Math.max(0, availableUnits),
      totalUnits: rentalItem.quantity,
      usedUnits,
      conflictingBookings: activeBookings.map((booking) => ({
        id: booking.id,
        startDate: booking.startDate.toISOString(),
        endDate: booking.endDate.toISOString(),
        units: booking.units,
      })),
    };

    return Result.ok(output);
  }
}
