import prisma from "~/db.server";

/**
 * Checks if the given quantity is available for the rental item over the date range.
 * Counts CONFIRMED and non-expired RESERVED bookings that overlap the range (RETURNED
 * and CANCELLED do not block availability). Compares total used units to the item's quantity.
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
