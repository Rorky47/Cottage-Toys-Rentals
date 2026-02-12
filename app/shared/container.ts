/**
 * Simple dependency injection container.
 * Manages creation and lifecycle of use cases and repositories.
 */

import type { PrismaClient } from "@prisma/client";
import prisma from "~/db.server";

// Repository implementations
import { PrismaBookingRepository } from "~/domains/booking/infrastructure/repositories/PrismaBookingRepository";
import { PrismaRentalItemRepository } from "~/domains/rental/infrastructure/repositories/PrismaRentalItemRepository";

// Use case implementations
import { CheckAvailabilityUseCase } from "~/domains/booking/application/useCases/CheckAvailabilityUseCase";
import { CreateBookingUseCase } from "~/domains/booking/application/useCases/CreateBookingUseCase";
import { ConfirmBookingUseCase } from "~/domains/booking/application/useCases/ConfirmBookingUseCase";
import { CleanupExpiredBookingsUseCase } from "~/domains/booking/application/useCases/CleanupExpiredBookingsUseCase";
import { CalculatePricingUseCase } from "~/domains/pricing/application/useCases/CalculatePricingUseCase";
import { CreateRentalItemUseCase } from "~/domains/rental/application/useCases/CreateRentalItemUseCase";
import { UpdateRentalItemUseCase } from "~/domains/rental/application/useCases/UpdateRentalItemUseCase";
import { TrackProductUseCase } from "~/domains/rental/application/useCases/TrackProductUseCase";
import { UpdateRentalBasicsUseCase } from "~/domains/rental/application/useCases/UpdateRentalBasicsUseCase";
import { DeleteRentalItemUseCase } from "~/domains/rental/application/useCases/DeleteRentalItemUseCase";

export interface IContainer {
  // Booking domain
  getCheckAvailabilityUseCase(): CheckAvailabilityUseCase;
  getCreateBookingUseCase(): CreateBookingUseCase;
  getConfirmBookingUseCase(): ConfirmBookingUseCase;
  getCleanupExpiredBookingsUseCase(): CleanupExpiredBookingsUseCase;
  
  // Pricing domain
  getCalculatePricingUseCase(): CalculatePricingUseCase;
  
  // Rental domain
  getCreateRentalItemUseCase(): CreateRentalItemUseCase;
  getUpdateRentalItemUseCase(): UpdateRentalItemUseCase;
  getTrackProductUseCase(adminApi: any): TrackProductUseCase;
  getUpdateRentalBasicsUseCase(adminApi: any): UpdateRentalBasicsUseCase;
  getDeleteRentalItemUseCase(): DeleteRentalItemUseCase;

  // Repositories (for edge cases where use case doesn't exist yet)
  getBookingRepository(): PrismaBookingRepository;
  getRentalItemRepository(): PrismaRentalItemRepository;
}

/**
 * Factory function to create container with dependencies.
 * Uses lazy initialization for repositories.
 */
export function createContainer(db: PrismaClient = prisma): IContainer {
  // Singleton repositories
  let bookingRepo: PrismaBookingRepository | null = null;
  let rentalItemRepo: PrismaRentalItemRepository | null = null;

  const getBookingRepo = () => {
    if (!bookingRepo) {
      bookingRepo = new PrismaBookingRepository(db);
    }
    return bookingRepo;
  };

  const getRentalItemRepo = () => {
    if (!rentalItemRepo) {
      rentalItemRepo = new PrismaRentalItemRepository(db);
    }
    return rentalItemRepo;
  };

  return {
    // Booking domain
    getCheckAvailabilityUseCase() {
      return new CheckAvailabilityUseCase(getBookingRepo(), getRentalItemRepo());
    },

    getCreateBookingUseCase() {
      return new CreateBookingUseCase(getBookingRepo(), getRentalItemRepo());
    },

    getConfirmBookingUseCase() {
      return new ConfirmBookingUseCase(getBookingRepo());
    },

    getCleanupExpiredBookingsUseCase() {
      return new CleanupExpiredBookingsUseCase(getBookingRepo());
    },

    // Pricing domain
    getCalculatePricingUseCase() {
      return new CalculatePricingUseCase(getRentalItemRepo());
    },

    // Rental domain
    getCreateRentalItemUseCase() {
      return new CreateRentalItemUseCase(getRentalItemRepo());
    },

    getUpdateRentalItemUseCase() {
      return new UpdateRentalItemUseCase(getRentalItemRepo());
    },

    getTrackProductUseCase(adminApi: any) {
      const { ShopifyProductAdapter } = require("~/domains/rental/infrastructure/adapters/ShopifyProductAdapter");
      const adapter = new ShopifyProductAdapter(adminApi);
      return new TrackProductUseCase(getRentalItemRepo(), adapter);
    },

    getUpdateRentalBasicsUseCase(adminApi: any) {
      const { ShopifyProductAdapter } = require("~/domains/rental/infrastructure/adapters/ShopifyProductAdapter");
      const adapter = new ShopifyProductAdapter(adminApi);
      return new UpdateRentalBasicsUseCase(getRentalItemRepo(), adapter);
    },

    getDeleteRentalItemUseCase() {
      return new DeleteRentalItemUseCase(getRentalItemRepo());
    },

    // Repositories
    getBookingRepository() {
      return getBookingRepo();
    },

    getRentalItemRepository() {
      return getRentalItemRepo();
    },
  };
}
