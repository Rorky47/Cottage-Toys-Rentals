import prisma from "~/db.server";

/**
 * Clean up expired RESERVED bookings
 * These are cart holds that were never converted to orders
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
