import { describe, it, expect, beforeEach } from "vitest";
import { CheckAvailabilityUseCase } from "../CheckAvailabilityUseCase";
import { MockBookingRepository } from "../../../../../shared/testing/mocks/MockBookingRepository";
import { MockRentalItemRepository } from "../../../../../shared/testing/mocks/MockRentalItemRepository";
import { TestFactories } from "../../../../../shared/testing/factories";

describe("CheckAvailabilityUseCase", () => {
  let bookingRepo: MockBookingRepository;
  let rentalItemRepo: MockRentalItemRepository;
  let useCase: CheckAvailabilityUseCase;

  beforeEach(() => {
    bookingRepo = new MockBookingRepository();
    rentalItemRepo = new MockRentalItemRepository();
    useCase = new CheckAvailabilityUseCase(bookingRepo, rentalItemRepo);
  });

  it("should return available when no conflicting bookings exist", async () => {
    // Arrange
    const rentalItem = TestFactories.createRentalItem({
      id: "item-1",
      quantity: 5,
    });
    await rentalItemRepo.save(rentalItem);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
      requestedUnits: 2,
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.available).toBe(true);
    expect(result.value.availableUnits).toBe(5);
    expect(result.value.usedUnits).toBe(0);
    expect(result.value.conflictingBookings).toHaveLength(0);
  });

  it("should return unavailable when requested units exceed available", async () => {
    // Arrange
    const rentalItem = TestFactories.createRentalItem({
      id: "item-1",
      quantity: 5,
    });
    await rentalItemRepo.save(rentalItem);

    // Create existing booking that uses 3 units
    const existingBooking = TestFactories.createBooking({
      id: "booking-1",
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
      units: 3,
    });
    await bookingRepo.save(existingBooking);

    // Act - try to book 3 more units (total would be 6, exceeds 5)
    const result = await useCase.execute({
      rentalItemId: "item-1",
      startDate: new Date("2026-03-03"),
      endDate: new Date("2026-03-07"),
      requestedUnits: 3,
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.available).toBe(false);
    expect(result.value.availableUnits).toBe(2); // 5 - 3 = 2
    expect(result.value.usedUnits).toBe(3);
    expect(result.value.conflictingBookings).toHaveLength(1);
  });

  it("should not count cancelled bookings against availability", async () => {
    // Arrange
    const rentalItem = TestFactories.createRentalItem({
      id: "item-1",
      quantity: 5,
    });
    await rentalItemRepo.save(rentalItem);

    // Create cancelled booking
    const cancelledBooking = TestFactories.createBooking({
      id: "booking-1",
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
      units: 3,
      status: "CANCELLED",
    });
    await bookingRepo.save(cancelledBooking);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
      requestedUnits: 5,
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.available).toBe(true);
    expect(result.value.usedUnits).toBe(0); // Cancelled booking doesn't count
  });

  it("should not count expired reservations against availability", async () => {
    // Arrange
    const rentalItem = TestFactories.createRentalItem({
      id: "item-1",
      quantity: 5,
    });
    await rentalItemRepo.save(rentalItem);

    // Create expired reservation
    const expiredReservation = TestFactories.createBooking({
      id: "booking-1",
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
      units: 3,
      status: "RESERVED",
      expiresAt: new Date("2026-02-01"), // Already expired
    });
    await bookingRepo.save(expiredReservation);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
      requestedUnits: 5,
    });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value.available).toBe(true);
    expect(result.value.usedUnits).toBe(0); // Expired reservation doesn't count
  });

  it("should fail when rental item not found", async () => {
    // Act
    const result = await useCase.execute({
      rentalItemId: "non-existent",
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-03-05"),
      requestedUnits: 1,
    });

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe("Rental item not found");
  });

  it("should fail when start date is after end date", async () => {
    // Arrange
    const rentalItem = TestFactories.createRentalItem({ id: "item-1" });
    await rentalItemRepo.save(rentalItem);

    // Act
    const result = await useCase.execute({
      rentalItemId: "item-1",
      startDate: new Date("2026-03-10"),
      endDate: new Date("2026-03-05"), // Before start date
      requestedUnits: 1,
    });

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain("Start date must be before end date");
  });

  it("should handle multiple bookings correctly", async () => {
    // Arrange
    const rentalItem = TestFactories.createRentalItem({
      id: "item-1",
      quantity: 10,
    });
    await rentalItemRepo.save(rentalItem);

    // Create 3 bookings
    await bookingRepo.save(
      TestFactories.createBooking({
        rentalItemId: "item-1",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-05"),
        units: 2,
      })
    );
    await bookingRepo.save(
      TestFactories.createBooking({
        rentalItemId: "item-1",
        startDate: new Date("2026-03-03"),
        endDate: new Date("2026-03-07"),
        units: 3,
      })
    );
    await bookingRepo.save(
      TestFactories.createBooking({
        rentalItemId: "item-1",
        startDate: new Date("2026-03-04"),
        endDate: new Date("2026-03-06"),
        units: 1,
      })
    );

    // Act - check availability during overlap (Mar 4-5)
    const result = await useCase.execute({
      rentalItemId: "item-1",
      startDate: new Date("2026-03-04"),
      endDate: new Date("2026-03-05"),
      requestedUnits: 5,
    });

    // Assert - all 3 bookings overlap, total 6 units used, 4 available
    expect(result.isSuccess).toBe(true);
    expect(result.value.available).toBe(false); // Requesting 5, only 4 available
    expect(result.value.usedUnits).toBe(6);
    expect(result.value.availableUnits).toBe(4);
  });
});
