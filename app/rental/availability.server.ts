import prisma from "~/db.server";

/**
 * @deprecated This file is part of the old architecture and will be removed in Week 5.
 * 
 * **Use instead**: `CheckAvailabilityUseCase` from `~/domains/booking/application/useCases/CheckAvailabilityUseCase`
 * 
 * **Migration path**:
 * ```typescript
 * // Old:
 * import { isAvailable } from "~/rental/availability.server";
 * const available = await isAvailable(itemId, start, end, units);
 * 
 * // New:
 * import { container } from "~/shared/container";
 * const useCase = container.getCheckAvailabilityUseCase();
 * const result = await useCase.execute({ rentalItemId, startDate, endDate, requestedUnits });
 * const available = result.value.available;
 * ```
 * 
 * **Why migrate**: New architecture is testable, reusable, and follows domain-driven design.
 */

/**
 * Checks if the given quantity is available for the rental item over the date range.
 * Counts CONFIRMED and non-expired RESERVED bookings that overlap the range (RETURNED
 * and CANCELLED do not block availability). Compares total used units to the item's quantity.
 * 
 * @deprecated Use CheckAvailabilityUseCase instead
 */
export async function isAvailable(
  rentalItemId: string,
  startDate: Date,
  endDate: Date,
  quantity: number
): Promise<boolean> {
  const now = new Date();

  const conflictingBookings = await prisma.booking.findMany({
    where: {
      rentalItemId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      OR: [
        { status: "CONFIRMED" },
        {
          status: "RESERVED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      ],
      // RETURNED and CANCELLED do not block availability
    },
    select: { units: true },
  });

  const usedUnits = conflictingBookings.reduce((sum, b) => sum + b.units, 0);

  const item = await prisma.rentalItem.findUnique({
    where: { id: rentalItemId },
    select: { quantity: true },
  });

  const maxQuantity = item?.quantity ?? 0;
  return usedUnits + quantity <= maxQuantity;
}
