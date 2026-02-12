import { RentalItem, PricingAlgorithm } from "~/domains/rental/domain/entities/RentalItem";
import { Booking, BookingStatus, FulfillmentMethod } from "~/domains/booking/domain/entities/Booking";
import { Money } from "~/shared/kernel/Money";

/**
 * Test data factories for creating domain entities.
 */

export const TestFactories = {
  /**
   * Create a test rental item with sensible defaults.
   */
  createRentalItem(overrides?: {
    id?: string;
    shop?: string;
    shopifyProductId?: string;
    name?: string;
    basePricePerDayCents?: number;
    currencyCode?: string;
    pricingAlgorithm?: PricingAlgorithm;
    quantity?: number;
    rateTiers?: Array<{ minDays: number; pricePerDayCents: number }>;
  }): RentalItem {
    const currencyCode = overrides?.currencyCode || "USD";
    const basePriceCents = overrides?.basePricePerDayCents || 1000; // $10/day
    const basePriceResult = Money.fromCents(basePriceCents, currencyCode);
    if (basePriceResult.isFailure) {
      throw new Error(`Failed to create Money: ${basePriceResult.error}`);
    }
    
    const result = RentalItem.create({
      id: overrides?.id,
      shop: overrides?.shop || "test-shop.myshopify.com",
      shopifyProductId: overrides?.shopifyProductId || "1234567890",
      name: overrides?.name || "Test Rental Item",
      imageUrl: null,
      currencyCode,
      basePricePerDay: basePriceResult.value,
      pricingAlgorithm: overrides?.pricingAlgorithm || PricingAlgorithm.FLAT,
      quantity: overrides?.quantity || 5,
      rateTiers: overrides?.rateTiers,
    });

    if (result.isFailure) {
      throw new Error(`Failed to create test rental item: ${result.error}`);
    }

    return result.value;
  },

  /**
   * Create a test booking with sensible defaults.
   */
  createBooking(overrides?: {
    id?: string;
    rentalItemId?: string;
    orderId?: string | null;
    startDate?: Date;
    endDate?: Date;
    units?: number;
    status?: BookingStatus;
    fulfillmentMethod?: FulfillmentMethod;
    expiresAt?: Date | null;
  }): Booking {
    const startDate = overrides?.startDate || new Date("2026-03-01");
    const endDate = overrides?.endDate || new Date("2026-03-05");

    const result = Booking.create({
      id: overrides?.id || crypto.randomUUID(),
      rentalItemId: overrides?.rentalItemId || "test-rental-item-1",
      orderId: overrides?.orderId !== undefined ? overrides.orderId : "order-123",
      startDate,
      endDate,
      units: overrides?.units || 1,
      status: overrides?.status || BookingStatus.CONFIRMED,
      fulfillmentMethod: overrides?.fulfillmentMethod || FulfillmentMethod.SHIP,
      expiresAt: overrides?.expiresAt !== undefined ? overrides.expiresAt : null,
    });

    if (result.isFailure) {
      throw new Error(`Failed to create test booking: ${result.error}`);
    }

    return result.value;
  },

  /**
   * Create a reserved booking (cart hold) with expiration.
   */
  createReservation(overrides?: {
    id?: string;
    rentalItemId?: string;
    cartToken?: string;
    startDate?: Date;
    endDate?: Date;
    units?: number;
    ttlMs?: number;
  }): Booking {
    const startDate = overrides?.startDate || new Date("2026-03-01");
    const endDate = overrides?.endDate || new Date("2026-03-05");

    const result = Booking.createReservation({
      id: overrides?.id || "test-reservation-1",
      rentalItemId: overrides?.rentalItemId || "test-rental-item-1",
      cartToken: overrides?.cartToken || "cart-token-123",
      startDate,
      endDate,
      units: overrides?.units || 1,
      fulfillmentMethod: FulfillmentMethod.UNKNOWN,
      ttlMs: overrides?.ttlMs,
    });

    if (result.isFailure) {
      throw new Error(`Failed to create test reservation: ${result.error}`);
    }

    return result.value;
  },
};
