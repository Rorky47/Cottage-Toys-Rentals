import type { PrismaClient } from "@prisma/client";
import { Booking } from "../../domain/entities/Booking";
import type { IBookingRepository } from "./IBookingRepository";
import { BookingMapper } from "./BookingMapper";
import type { DateRange } from "~/shared/kernel";

/**
 * Prisma implementation of booking repository.
 */
export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Booking | null> {
    const raw = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!raw) {
      return null;
    }

    const result = BookingMapper.toDomain(raw);
    return result.isSuccess ? result.value : null;
  }

  async findByRentalItem(rentalItemId: string, dateRange: DateRange): Promise<Booking[]> {
    const now = new Date();

    const raw = await this.prisma.booking.findMany({
      where: {
        rentalItemId,
        startDate: { lte: dateRange.endDate },
        endDate: { gte: dateRange.startDate },
        OR: [
          { status: "CONFIRMED" },
          {
            status: "RESERVED",
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        ],
      },
    });

    return BookingMapper.toDomainArray(raw);
  }

  async findByRentalItemAndDateRange(
    rentalItemId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]> {
    const raw = await this.prisma.booking.findMany({
      where: {
        rentalItemId,
        startDate,
        endDate,
      },
    });

    return BookingMapper.toDomainArray(raw);
  }

  async findByOrderId(orderId: string): Promise<Booking[]> {
    const raw = await this.prisma.booking.findMany({
      where: { orderId },
    });

    return BookingMapper.toDomainArray(raw);
  }

  async findReservedByRentalItemId(rentalItemId: string): Promise<Booking[]> {
    const raw = await this.prisma.booking.findMany({
      where: {
        rentalItemId,
        status: "RESERVED",
      },
    });

    return BookingMapper.toDomainArray(raw);
  }

  async findExpired(now: Date): Promise<Booking[]> {
    const raw = await this.prisma.booking.findMany({
      where: {
        status: "RESERVED",
        expiresAt: { lte: now },
      },
    });

    return BookingMapper.toDomainArray(raw);
  }

  async save(booking: Booking): Promise<void> {
    const data = BookingMapper.toPrisma(booking);

    await this.prisma.booking.upsert({
      where: { id: booking.id },
      create: data,
      update: data,
    });
  }

  async saveMany(bookings: Booking[]): Promise<void> {
    await this.prisma.$transaction(
      bookings.map((booking) => {
        const data = BookingMapper.toPrisma(booking);
        return this.prisma.booking.upsert({
          where: { id: booking.id },
          create: data,
          update: data,
        });
      })
    );
  }

  async delete(id: string): Promise<void> {
    await this.prisma.booking.delete({
      where: { id },
    });
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.prisma.booking.deleteMany({
      where: { id: { in: ids } },
    });
  }

  async findByShopAndDateRange(
    shop: string,
    startDate: Date,
    endDate: Date,
    now: Date
  ): Promise<Array<{ booking: Booking; rentalItemName: string | null }>> {
    const raw = await this.prisma.booking.findMany({
      where: {
        rentalItem: { shop },
        startDate: { lt: endDate },
        endDate: { gt: startDate },
        OR: [
          { status: "CONFIRMED" },
          { status: "RESERVED", expiresAt: { gt: now } },
          { status: "RETURNED" },
        ],
      },
      include: { rentalItem: true },
      orderBy: { startDate: "asc" },
    });

    return raw
      .map((record) => {
        const result = BookingMapper.toDomain(record);
        if (result.isFailure) return null;
        return {
          booking: result.value,
          rentalItemName: record.rentalItem.name ?? null,
        };
      })
      .filter((item): item is { booking: Booking; rentalItemName: string | null } => item !== null);
  }

  async updateStatus(
    shop: string,
    bookingId: string,
    status: Booking["status"],
    fulfillmentMethod: "SHIP" | "PICKUP" | "UNKNOWN"
  ): Promise<boolean> {
    const data: { status: string; fulfillmentMethod: string; expiresAt?: null } = {
      status,
      fulfillmentMethod,
    };

    // Clear expiration when confirming or marking as returned
    if (status === "CONFIRMED" || status === "RETURNED") {
      data.expiresAt = null;
    }

    const result = await this.prisma.booking.updateMany({
      where: { id: bookingId, rentalItem: { shop } },
      data,
    });

    return result.count > 0;
  }
}
