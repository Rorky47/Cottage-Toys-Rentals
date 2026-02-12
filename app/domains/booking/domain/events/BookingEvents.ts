import { BaseDomainEvent } from "~/shared/kernel";

export class BookingCreatedEvent extends BaseDomainEvent {
  constructor(
    bookingId: string,
    public readonly rentalItemId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly units: number
  ) {
    super(bookingId, "BookingCreated");
  }
}

export class BookingConfirmedEvent extends BaseDomainEvent {
  constructor(
    bookingId: string,
    public readonly orderId: string
  ) {
    super(bookingId, "BookingConfirmed");
  }
}

export class BookingCancelledEvent extends BaseDomainEvent {
  constructor(
    bookingId: string,
    public readonly reason?: string
  ) {
    super(bookingId, "BookingCancelled");
  }
}

export class BookingReturnedEvent extends BaseDomainEvent {
  constructor(
    bookingId: string,
    public readonly returnedAt: Date
  ) {
    super(bookingId, "BookingReturned");
  }
}
