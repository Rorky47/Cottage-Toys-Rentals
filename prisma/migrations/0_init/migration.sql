-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PricingAlgorithm" AS ENUM ('FLAT', 'TIERED');

-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('UNKNOWN', 'SHIP', 'PICKUP');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_references" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_items" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "name" TEXT,
    "image_url" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'USD',
    "base_price_per_day_cents" INTEGER NOT NULL,
    "pricing_algorithm" "PricingAlgorithm" NOT NULL DEFAULT 'FLAT',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_tiers" (
    "id" TEXT NOT NULL,
    "rental_item_id" TEXT NOT NULL,
    "min_days" INTEGER NOT NULL,
    "price_per_day_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "rental_item_id" TEXT NOT NULL,
    "order_id" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "fulfillment_method" "FulfillmentMethod" NOT NULL DEFAULT 'UNKNOWN',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_references_shop_shopify_product_id_key" ON "product_references"("shop", "shopify_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "rental_items_shop_shopify_product_id_key" ON "rental_items"("shop", "shopify_product_id");

-- CreateIndex
CREATE INDEX "rate_tiers_rental_item_id_idx" ON "rate_tiers"("rental_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "rate_tiers_rental_item_id_min_days_key" ON "rate_tiers"("rental_item_id", "min_days");

-- CreateIndex
CREATE INDEX "bookings_rental_item_id_idx" ON "bookings"("rental_item_id");

-- CreateIndex
CREATE INDEX "bookings_start_date_end_date_idx" ON "bookings"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "bookings_rental_item_id_start_date_idx" ON "bookings"("rental_item_id", "start_date");

-- CreateIndex
CREATE INDEX "bookings_status_order_id_idx" ON "bookings"("status", "order_id");

-- AddForeignKey
ALTER TABLE "rate_tiers" ADD CONSTRAINT "rate_tiers_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

