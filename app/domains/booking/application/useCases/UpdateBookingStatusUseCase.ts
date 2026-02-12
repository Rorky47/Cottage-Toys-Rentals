import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import { Result } from "~/shared/kernel/Result";
import type {
  UpdateBookingStatusInput,
  UpdateBookingStatusOutput,
} from "./dto/UpdateBookingStatusDto";

/**
 * UpdateBookingStatusUseCase
 * 
 * Updates the status and fulfillment method of a booking from the calendar admin UI.
 * 
 * **Business Rules**:
 * - Can only update bookings belonging to the specified shop (security)
 * - When marking as CONFIRMED or RETURNED, clears expiration date
 * - All status transitions allowed (merchant has full control from admin)
 * 
 * @example
 * ```typescript
 * const useCase = new UpdateBookingStatusUseCase(bookingRepo);
 * const result = await useCase.execute({
 *   shop: "myshop.myshopify.com",
 *   bookingId: "booking_123",
 *   status: "CONFIRMED",
 *   fulfillmentMethod: "SHIP"
 * });
 * ```
 */
export class UpdateBookingStatusUseCase {
  constructor(private bookingRepository: IBookingRepository) {}

  async execute(input: UpdateBookingStatusInput): Promise<Result<UpdateBookingStatusOutput>> {
    const { shop, bookingId, status, fulfillmentMethod } = input;

    // Validate inputs
    if (!shop || typeof shop !== "string") {
      return Result.fail("Shop is required");
    }
    if (!bookingId || typeof bookingId !== "string") {
      return Result.fail("Booking ID is required");
    }
    if (!status || !["RESERVED", "CONFIRMED", "CANCELLED", "RETURNED"].includes(status)) {
      return Result.fail("Invalid status");
    }
    if (!fulfillmentMethod || !["SHIP", "PICKUP", "UNKNOWN"].includes(fulfillmentMethod)) {
      return Result.fail("Invalid fulfillment method");
    }

    try {
      // Update via repository
      const updated = await this.bookingRepository.updateStatus(
        shop,
        bookingId,
        status,
        fulfillmentMethod
      );

      if (!updated) {
        return Result.fail("Booking not found or does not belong to this shop");
      }

      return Result.ok({ updated: true });
    } catch (error: any) {
      return Result.fail(`Failed to update booking status: ${error.message}`);
    }
  }
}
