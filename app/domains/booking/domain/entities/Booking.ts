import { Entity, Result, DateRange } from "~/shared/kernel";
import {
  BookingCreatedEvent,
  BookingConfirmedEvent,
  BookingCancelledEvent,
  BookingReturnedEvent,
} from "../events/BookingEvents";

export enum BookingStatus {
  RESERVED = "RESERVED",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
}

export enum FulfillmentMethod {
  UNKNOWN = "UNKNOWN",
  SHIP = "SHIP",
  PICKUP = "PICKUP",
}

interface BookingProps {
  rentalItemId: string;
  orderId: string | null;
  dateRange: DateRange;
  units: number;
  status: BookingStatus;
  fulfillmentMethod: FulfillmentMethod;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Booking entity represents a rental reservation.
 * Contains business rules for booking lifecycle (create, confirm, cancel, return).
 */
export class Booking extends Entity {
  private constructor(
    id: string,
    private props: BookingProps
  ) {
    super(id);
  }

  static create(data: {
    id: string;
    rentalItemId: string;
    orderId: string | null;
    startDate: Date;
    endDate: Date;
    units: number;
    status: BookingStatus;
    fulfillmentMethod: FulfillmentMethod;
    expiresAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<Booking> {
    const dateRangeResult = DateRange.create(data.startDate, data.endDate);
    if (dateRangeResult.isFailure) {
      return Result.fail(dateRangeResult.error);
    }

    if (data.units < 1) {
      return Result.fail("Units must be at least 1");
    }

    const booking = new Booking(data.id, {
      rentalItemId: data.rentalItemId,
      orderId: data.orderId,
      dateRange: dateRangeResult.value,
      units: data.units,
      status: data.status,
      fulfillmentMethod: data.fulfillmentMethod,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    });

    if (data.status === BookingStatus.RESERVED && !data.orderId) {
      booking.addDomainEvent(
        new BookingCreatedEvent(
          booking.id,
          data.rentalItemId,
          data.startDate,
          data.endDate,
          data.units
        )
      );
    }

    return Result.ok(booking);
  }

  static createReservation(data: {
    id: string;
    rentalItemId: string;
    cartToken: string;
    startDate: Date;
    endDate: Date;
    units: number;
    fulfillmentMethod: FulfillmentMethod;
    ttlMs?: number;
  }): Result<Booking> {
    const TTL_MS = data.ttlMs || 45 * 60 * 1000; // 45 minutes default
    const expiresAt = new Date(Date.now() + TTL_MS);
    const orderId = `cart:${data.cartToken}`;

    return Booking.create({
      id: data.id,
      rentalItemId: data.rentalItemId,
      orderId,
      startDate: data.startDate,
      endDate: data.endDate,
      units: data.units,
      status: BookingStatus.RESERVED,
      fulfillmentMethod: data.fulfillmentMethod,
      expiresAt,
    });
  }

  confirm(orderId: string): Result<void> {
    if (this.props.status !== BookingStatus.RESERVED) {
      return Result.fail("Can only confirm reserved bookings");
    }
    if (!orderId || orderId.trim() === "") {
      return Result.fail("Order ID is required to confirm booking");
    }

    this.props.status = BookingStatus.CONFIRMED;
    this.props.orderId = orderId;
    this.props.expiresAt = null;
    this.props.updatedAt = new Date();

    this.addDomainEvent(new BookingConfirmedEvent(this.id, orderId));
    return Result.ok(undefined);
  }

  cancel(reason?: string): Result<void> {
    if (this.props.status === BookingStatus.RETURNED) {
      return Result.fail("Cannot cancel returned bookings");
    }
    if (this.props.status === BookingStatus.CANCELLED) {
      return Result.fail("Booking is already cancelled");
    }

    this.props.status = BookingStatus.CANCELLED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(new BookingCancelledEvent(this.id, reason));
    return Result.ok(undefined);
  }

  markAsReturned(): Result<void> {
    if (this.props.status !== BookingStatus.CONFIRMED) {
      return Result.fail("Can only mark confirmed bookings as returned");
    }

    this.props.status = BookingStatus.RETURNED;
    this.props.updatedAt = new Date();

    this.addDomainEvent(new BookingReturnedEvent(this.id, new Date()));
    return Result.ok(undefined);
  }

  isExpired(now: Date = new Date()): boolean {
    if (!this.props.expiresAt) {
      return false;
    }
    return now > this.props.expiresAt;
  }

  isActive(): boolean {
    return (
      this.props.status === BookingStatus.CONFIRMED ||
      (this.props.status === BookingStatus.RESERVED && !this.isExpired())
    );
  }

  overlapsWith(dateRange: DateRange): boolean {
    if (!this.isActive()) {
      return false;
    }
    return this.props.dateRange.overlapsWith(dateRange);
  }

  get rentalItemId(): string {
    return this.props.rentalItemId;
  }

  get orderId(): string | null {
    return this.props.orderId;
  }

  get dateRange(): DateRange {
    return this.props.dateRange;
  }

  get startDate(): Date {
    return this.props.dateRange.startDate;
  }

  get endDate(): Date {
    return this.props.dateRange.endDate;
  }

  get units(): number {
    return this.props.units;
  }

  get status(): BookingStatus {
    return this.props.status;
  }

  get fulfillmentMethod(): FulfillmentMethod {
    return this.props.fulfillmentMethod;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  get durationDays(): number {
    return this.props.dateRange.durationDays;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
