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
import { CreateConfirmedBookingUseCase } from "~/domains/booking/application/useCases/CreateConfirmedBookingUseCase";
import { ConfirmBookingUseCase } from "~/domains/booking/application/useCases/ConfirmBookingUseCase";
import { ConfirmBookingByIdUseCase } from "~/domains/booking/application/useCases/ConfirmBookingByIdUseCase";
import { PromoteBookingByDatesUseCase } from "~/domains/booking/application/useCases/PromoteBookingByDatesUseCase";
import { CleanupExpiredBookingsUseCase } from "~/domains/booking/application/useCases/CleanupExpiredBookingsUseCase";
import { DeleteReservationUseCase } from "~/domains/booking/application/useCases/DeleteReservationUseCase";
import { GetCalendarBookingsUseCase } from "~/domains/booking/application/useCases/GetCalendarBookingsUseCase";
import { UpdateBookingStatusUseCase } from "~/domains/booking/application/useCases/UpdateBookingStatusUseCase";
import { CancelBookingsByOrderIdUseCase } from "~/domains/booking/application/useCases/CancelBookingsByOrderIdUseCase";
import { CancelReservedBookingsByRentalItemUseCase } from "~/domains/booking/application/useCases/CancelReservedBookingsByRentalItemUseCase";
import { CalculatePricingUseCase } from "~/domains/pricing/application/useCases/CalculatePricingUseCase";
import { CreateRentalItemUseCase } from "~/domains/rental/application/useCases/CreateRentalItemUseCase";
import { UpdateRentalItemUseCase } from "~/domains/rental/application/useCases/UpdateRentalItemUseCase";
import { UpsertRentalItemUseCase } from "~/domains/rental/application/useCases/UpsertRentalItemUseCase";
import { TrackProductUseCase } from "~/domains/rental/application/useCases/TrackProductUseCase";
import { UpdateRentalBasicsUseCase } from "~/domains/rental/application/useCases/UpdateRentalBasicsUseCase";
import { DeleteRentalItemUseCase } from "~/domains/rental/application/useCases/DeleteRentalItemUseCase";
import { GetRentalItemsForDashboardUseCase } from "~/domains/rental/application/useCases/GetRentalItemsForDashboardUseCase";

// Adapters
import { ShopifyProductAdapter } from "~/domains/rental/infrastructure/adapters/ShopifyProductAdapter";

// Shop domain
import { AcceptPrivacyPolicyUseCase } from "~/domains/shop/application/useCases/AcceptPrivacyPolicyUseCase";
import { GetShopPrivacyStatusUseCase } from "~/domains/shop/application/useCases/GetShopPrivacyStatusUseCase";
import { PrismaShopSettingsRepository } from "~/domains/shop/infrastructure/persistence/PrismaShopSettingsRepository";

export interface IContainer {
  // Booking domain
  getCheckAvailabilityUseCase(): CheckAvailabilityUseCase;
  getCreateBookingUseCase(): CreateBookingUseCase;
  getCreateConfirmedBookingUseCase(): CreateConfirmedBookingUseCase;
  getConfirmBookingUseCase(): ConfirmBookingUseCase;
  getConfirmBookingByIdUseCase(): ConfirmBookingByIdUseCase;
  getPromoteBookingByDatesUseCase(): PromoteBookingByDatesUseCase;
  getCleanupExpiredBookingsUseCase(): CleanupExpiredBookingsUseCase;
  getDeleteReservationUseCase(): DeleteReservationUseCase;
  getGetCalendarBookingsUseCase(): GetCalendarBookingsUseCase;
  getUpdateBookingStatusUseCase(): UpdateBookingStatusUseCase;
  getCancelBookingsByOrderIdUseCase(): CancelBookingsByOrderIdUseCase;
  getCancelReservedBookingsByRentalItemUseCase(): CancelReservedBookingsByRentalItemUseCase;
  
  // Pricing domain
  getCalculatePricingUseCase(): CalculatePricingUseCase;
  
  // Rental domain
  getCreateRentalItemUseCase(): CreateRentalItemUseCase;
  getUpdateRentalItemUseCase(): UpdateRentalItemUseCase;
  getUpsertRentalItemUseCase(): UpsertRentalItemUseCase;
  getTrackProductUseCase(adminApi: any): TrackProductUseCase;
  getUpdateRentalBasicsUseCase(adminApi: any): UpdateRentalBasicsUseCase;
  getDeleteRentalItemUseCase(adminApi: any): DeleteRentalItemUseCase;
  getGetRentalItemsForDashboardUseCase(): GetRentalItemsForDashboardUseCase;

  // Shop domain
  getAcceptPrivacyPolicyUseCase(): AcceptPrivacyPolicyUseCase;
  getGetShopPrivacyStatusUseCase(): GetShopPrivacyStatusUseCase;

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
  let shopSettingsRepo: PrismaShopSettingsRepository | null = null;

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

  const getShopSettingsRepo = () => {
    if (!shopSettingsRepo) {
      shopSettingsRepo = new PrismaShopSettingsRepository(db);
    }
    return shopSettingsRepo;
  };

  return {
    // Booking domain
    getCheckAvailabilityUseCase() {
      return new CheckAvailabilityUseCase(getBookingRepo(), getRentalItemRepo());
    },

    getCreateBookingUseCase() {
      return new CreateBookingUseCase(getBookingRepo(), getRentalItemRepo());
    },

    getCreateConfirmedBookingUseCase() {
      return new CreateConfirmedBookingUseCase(getBookingRepo());
    },

    getConfirmBookingUseCase() {
      return new ConfirmBookingUseCase(getBookingRepo());
    },

    getConfirmBookingByIdUseCase() {
      return new ConfirmBookingByIdUseCase(getBookingRepo());
    },

    getPromoteBookingByDatesUseCase() {
      return new PromoteBookingByDatesUseCase(getBookingRepo());
    },

    getCleanupExpiredBookingsUseCase() {
      return new CleanupExpiredBookingsUseCase(getBookingRepo());
    },

    getDeleteReservationUseCase() {
      return new DeleteReservationUseCase(getBookingRepo());
    },

    getGetCalendarBookingsUseCase() {
      return new GetCalendarBookingsUseCase(getBookingRepo());
    },

    getUpdateBookingStatusUseCase() {
      return new UpdateBookingStatusUseCase(getBookingRepo());
    },

    getCancelBookingsByOrderIdUseCase() {
      return new CancelBookingsByOrderIdUseCase(getBookingRepo());
    },

    getCancelReservedBookingsByRentalItemUseCase() {
      return new CancelReservedBookingsByRentalItemUseCase(getBookingRepo());
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

    getUpsertRentalItemUseCase() {
      return new UpsertRentalItemUseCase(getRentalItemRepo());
    },

    getTrackProductUseCase(adminApi: any) {
      const adapter = new ShopifyProductAdapter(adminApi);
      return new TrackProductUseCase(getRentalItemRepo(), adapter);
    },

    getUpdateRentalBasicsUseCase(adminApi: any) {
      const adapter = new ShopifyProductAdapter(adminApi);
      return new UpdateRentalBasicsUseCase(getRentalItemRepo(), adapter);
    },

    getDeleteRentalItemUseCase(adminApi: any) {
      const adapter = new ShopifyProductAdapter(adminApi);
      return new DeleteRentalItemUseCase(getRentalItemRepo(), adapter);
    },

    getGetRentalItemsForDashboardUseCase() {
      return new GetRentalItemsForDashboardUseCase(getRentalItemRepo());
    },

    // ===== Shop Domain =====
    getAcceptPrivacyPolicyUseCase() {
      return new AcceptPrivacyPolicyUseCase(getShopSettingsRepo());
    },

    getGetShopPrivacyStatusUseCase() {
      return new GetShopPrivacyStatusUseCase(getShopSettingsRepo());
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
