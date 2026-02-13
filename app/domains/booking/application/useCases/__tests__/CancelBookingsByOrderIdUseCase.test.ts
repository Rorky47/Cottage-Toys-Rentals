import { describe, it, expect, beforeEach } from "vitest";
import { CancelBookingsByOrderIdUseCase } from "../CancelBookingsByOrderIdUseCase";
import { MockBookingRepository } from "../../../../../shared/testing/mocks/MockBookingRepository";
import { TestFactories } from "../../../../../shared/testing/factories";
import { BookingStatus } from "../../../domain/entities/Booking";

describe("CancelBookingsByOrderIdUseCase", () => {
  let bookingRepo: MockBookingRepository;
  let useCase: CancelBookingsByOrderIdUseCase;

  beforeEach(() => {
    bookingRepo = new MockBookingRepository();
    useCase = new CancelBookingsByOrderIdUseCase(bookingRepo);
  });

  it("should cancel all bookings for an order", async () => {
    // Arrange
    const booking1 = TestFactories.createConfirmedBooking({
      id: "booking-1",
      orderId: "order-123",
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
    });

    const booking2 = TestFactories.createConfirmedBooking({
      id: "booking-2",
      orderId: "order-123",
      rentalItemId: "item-2",
      startDate: new Date("2026-03-10"),
      endDate: new Date("2026-03-15"),
    });

    await bookingRepo.save(booking1);
    await bookingRepo.save(booking2);

    // Act
    const result = await useCase.execute({
      orderId: "order-123",
      reason: "Customer cancelled order",
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.cancelledCount).toBe(2);
    expect(result.value.bookingIds).toEqual(["booking-1", "booking-2"]);

    const savedBooking1 = await bookingRepo.findById("booking-1");
    const savedBooking2 = await bookingRepo.findById("booking-2");
    expect(savedBooking1?.status).toBe(BookingStatus.CANCELLED);
    expect(savedBooking2?.status).toBe(BookingStatus.CANCELLED);
  });

  it("should return zero count when no bookings exist for order", async () => {
    // Act
    const result = await useCase.execute({
      orderId: "nonexistent-order",
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.cancelledCount).toBe(0);
    expect(result.value.bookingIds).toEqual([]);
  });

  it("should skip already cancelled bookings", async () => {
    // Arrange
    const booking1 = TestFactories.createConfirmedBooking({
      id: "booking-1",
      orderId: "order-123",
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
    });

    // Manually cancel booking1
    booking1.cancel("Already cancelled");
    await bookingRepo.save(booking1);

    const booking2 = TestFactories.createConfirmedBooking({
      id: "booking-2",
      orderId: "order-123",
      rentalItemId: "item-2",
      startDate: new Date("2026-03-10"),
      endDate: new Date("2026-03-15"),
    });
    await bookingRepo.save(booking2);

    // Act
    const result = await useCase.execute({
      orderId: "order-123",
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.cancelledCount).toBe(1);
    expect(result.value.bookingIds).toEqual(["booking-2"]);
  });

  it("should fail when order ID is empty", async () => {
    // Act
    const result = await useCase.execute({ orderId: "" });

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("Order ID is required");
  });
});
