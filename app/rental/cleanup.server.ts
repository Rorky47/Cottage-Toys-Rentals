import prisma from "~/db.server";

/**
 * @deprecated This file is part of the old architecture and will be removed in Week 5.
 * 
 * **Use instead**: `CleanupExpiredBookingsUseCase` from `~/domains/booking/application/useCases/CleanupExpiredBookingsUseCase`
 * 
 * **Migration path**:
 * ```typescript
 * // Old:
 * import { cleanupExpiredReservations } from "~/rental/cleanup.server";
 * await cleanupExpiredReservations();
 * 
 * // New:
 * import { container } from "~/shared/container";
 * const useCase = container.getCleanupExpiredBookingsUseCase();
 * await useCase.execute();
 * ```
 * 
 * **Currently used by**: `app/features/appPages/calendar.server.ts` (needs migration in Week 4)
 */

/**
 * Clean up expired RESERVED bookings
 * These are cart holds that were never converted to orders
 * 
 * @deprecated Use CleanupExpiredBookingsUseCase instead
 */
export async function cleanupExpiredReservations() {
  const now = new Date();

  const deleted = await prisma.booking.deleteMany({
    where: {
      status: "RESERVED",
      expiresAt: {
        not: null,
        lt: now, // Expired (in the past)
      },
    },
  });

  if (deleted.count > 0) {
    console.log(`[cleanup] Deleted ${deleted.count} expired reservation(s)`);
  }

  return deleted.count;
}
