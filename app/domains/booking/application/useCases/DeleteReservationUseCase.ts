import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import { Result } from "~/shared/kernel/Result";
import type { DeleteReservationInput, DeleteReservationOutput } from "./dto/DeleteReservationDto";

/**
 * DeleteReservationUseCase
 * 
 * Deletes a RESERVED booking by its booking reference.
 * 
 * **Use Case**: When a customer removes items from their cart or abandons cart,
 * we need to release the temporary hold on inventory.
 * 
 * **Why delete instead of cancel?**
 * - RESERVED bookings are temporary cart holds, not actual orders
 * - No audit trail needed for cart operations
 * - Keeps database clean from abandoned cart noise
 * 
 * **For confirmed orders**, use CancelBookingUseCase instead.
 * 
 * @example
 * ```typescript
 * const useCase = new DeleteReservationUseCase(bookingRepo);
 * const result = await useCase.execute({ bookingRef: "booking_xyz" });
 * 
 * if (result.isSuccess) {
 *   console.log("Reservation deleted:", result.value.deleted);
 * }
 * ```
 */
export class DeleteReservationUseCase {
  constructor(private bookingRepository: IBookingRepository) {}

  async execute(input: DeleteReservationInput): Promise<Result<DeleteReservationOutput>> {
    const { bookingRef } = input;

    if (!bookingRef || typeof bookingRef !== "string" || bookingRef.trim() === "") {
      return Result.fail("Booking reference is required");
    }

    try {
      // Find the booking first to verify it's RESERVED
      const booking = await this.bookingRepository.findById(bookingRef);

      if (!booking) {
        return Result.fail("Booking not found");
      }

      // Safety check: Only allow deletion of RESERVED bookings
      if (booking.status !== "RESERVED") {
        return Result.fail("Can only delete RESERVED bookings. Use CancelBookingUseCase for confirmed orders.");
      }

      // Delete the reservation
      await this.bookingRepository.delete(booking.id);

      return Result.ok({
        deleted: true,
      });
    } catch (error: any) {
      return Result.fail(`Failed to delete reservation: ${error.message}`);
    }
  }
}
