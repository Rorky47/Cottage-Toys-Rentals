import type { IBookingRepository } from "../../infrastructure/repositories/IBookingRepository";
import { Result } from "~/shared/kernel/Result";
import type {
  GetCalendarBookingsInput,
  GetCalendarBookingsOutput,
  CalendarBookingDto,
} from "./dto/GetCalendarBookingsDto";

/**
 * GetCalendarBookingsUseCase
 * 
 * Fetches all bookings for a given shop and month for calendar display.
 * 
 * **Business Rules**:
 * - Only shows CONFIRMED, active RESERVED (not expired), and RETURNED bookings
 * - Bookings overlapping the month are included even if they start/end outside
 * - Results sorted by start date ascending
 * 
 * @example
 * ```typescript
 * const useCase = new GetCalendarBookingsUseCase(bookingRepo);
 * const result = await useCase.execute({
 *   shop: "myshop.myshopify.com",
 *   year: 2026,
 *   month: 1 // February (0-indexed)
 * });
 * ```
 */
export class GetCalendarBookingsUseCase {
  constructor(private bookingRepository: IBookingRepository) {}

  async execute(input: GetCalendarBookingsInput): Promise<Result<GetCalendarBookingsOutput>> {
    const { shop, year, month } = input;

    // Validate inputs
    if (!shop || typeof shop !== "string") {
      return Result.fail("Shop is required");
    }
    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return Result.fail("Invalid year");
    }
    if (!Number.isFinite(month) || month < 0 || month > 11) {
      return Result.fail("Invalid month (must be 0-11)");
    }

    try {
      const now = new Date();
      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 1));

      // Fetch bookings from repository
      const bookingsWithNames = await this.bookingRepository.findByShopAndDateRange(
        shop,
        monthStart,
        monthEnd,
        now
      );

      // Map to DTOs
      const bookings: CalendarBookingDto[] = bookingsWithNames.map(({ booking, rentalItemName }) => {
        // Format dates as YYYY-MM-DD
        const startDate = booking.startDate.toISOString().split("T")[0];
        const endDate = booking.endDate.toISOString().split("T")[0];

        // Get fulfillment method safely
        const fulfillmentMethod = booking.fulfillmentMethod ?? "UNKNOWN";

        return {
          id: booking.id,
          startDate,
          endDate,
          units: booking.units,
          rentalItemName,
          status: booking.status,
          fulfillmentMethod,
          orderId: booking.orderId ?? null,
        };
      });

      return Result.ok({ bookings });
    } catch (error: any) {
      return Result.fail(`Failed to fetch calendar bookings: ${error.message}`);
    }
  }
}
