import { describe, it, expect, beforeEach } from "vitest";
import { CancelReservedBookingsByRentalItemUseCase } from "../CancelReservedBookingsByRentalItemUseCase";
import { MockBookingRepository } from "../../../../../shared/testing/mocks/MockBookingRepository";
import { TestFactories } from "../../../../../shared/testing/factories";
import { BookingStatus } from "../../../domain/entities/Booking";

describe("CancelReservedBookingsByRentalItemUseCase", () => {
  let bookingRepo: MockBookingRepository;
  let useCase: CancelReservedBookingsByRentalItemUseCase;

  beforeEach(() => {
    bookingRepo = new MockBookingRepository();
    useCase = new CancelReservedBookingsByRentalItemUseCase(bookingRepo);
  });

  it("should cancel only RESERVED bookings for a rental item", async () => {
    // Arrange
    const reservedBooking = TestFactories.createReservedBooking({
      id: "booking-1",
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
    });

    const confirmedBooking = TestFactories.createConfirmedBooking({
      id: "booking-2",
      rentalItemId: "item-1",
      orderId: "order-123",
      startDate: new Date("2026-03-10"),
      endDate: new Date("2026-03-15"),
    });

    await bookingRepo.save(reservedBooking);
    await bookingRepo.save(confirmedBooking);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
      reason: "Product deleted",
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.cancelledCount).toBe(1);
    expect(result.value.bookingIds).toEqual(["booking-1"]);

    const savedReserved = await bookingRepo.findById("booking-1");
    const savedConfirmed = await bookingRepo.findById("booking-2");
    
    expect(savedReserved?.status).toBe(BookingStatus.CANCELLED);
    expect(savedConfirmed?.status).toBe(BookingStatus.CONFIRMED); // Unchanged
  });

  it("should return zero count when no RESERVED bookings exist", async () => {
    // Arrange - only confirmed booking
    const confirmedBooking = TestFactories.createConfirmedBooking({
      id: "booking-1",
      rentalItemId: "item-1",
      orderId: "order-123",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
    });
    await bookingRepo.save(confirmedBooking);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.cancelledCount).toBe(0);
    expect(result.value.bookingIds).toEqual([]);
  });

  it("should handle multiple RESERVED bookings", async () => {
    // Arrange
    const booking1 = TestFactories.createReservedBooking({
      id: "booking-1",
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
    });

    const booking2 = TestFactories.createReservedBooking({
      id: "booking-2",
      rentalItemId: "item-1",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-04-05"),
    });

    await bookingRepo.save(booking1);
    await bookingRepo.save(booking2);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.cancelledCount).toBe(2);
    expect(result.value.bookingIds).toEqual(["booking-1", "booking-2"]);
  });

  it("should fail when rental item ID is empty", async () => {
    // Act
    const result = await useCase.execute({ rentalItemId: "" });

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("Rental item ID is required");
  });
});
