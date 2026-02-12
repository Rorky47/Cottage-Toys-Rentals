import type { Booking as PrismaBooking } from "@prisma/client";
import { Booking, BookingStatus, FulfillmentMethod } from "../../domain/entities/Booking";
import { Result } from "~/shared/kernel";

/**
 * Maps between Prisma booking records and domain Booking entities.
 */
export class BookingMapper {
  /**
   * Convert Prisma booking to domain entity.
   */
  static toDomain(raw: PrismaBooking): Result<Booking> {
    return Booking.create({
      id: raw.id,
      rentalItemId: raw.rentalItemId,
      orderId: raw.orderId,
      startDate: raw.startDate,
      endDate: raw.endDate,
      units: raw.units,
      status: raw.status as BookingStatus,
      fulfillmentMethod: raw.fulfillmentMethod as FulfillmentMethod,
      expiresAt: raw.expiresAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma record format.
   */
  static toPrisma(booking: Booking): Omit<PrismaBooking, "createdAt" | "updatedAt"> {
    return {
      id: booking.id,
      rentalItemId: booking.rentalItemId,
      orderId: booking.orderId,
      startDate: booking.startDate,
      endDate: booking.endDate,
      units: booking.units,
      status: booking.status,
      fulfillmentMethod: booking.fulfillmentMethod,
      expiresAt: booking.expiresAt,
    };
  }

  /**
   * Map array of Prisma bookings to domain entities.
   */
  static toDomainArray(raw: PrismaBooking[]): Booking[] {
    return raw
      .map((r) => this.toDomain(r))
      .filter((result) => result.isSuccess)
      .map((result) => result.value);
  }
}
