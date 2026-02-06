-- CreateTable
CREATE TABLE "rental_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "name" TEXT,
    "image_url" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'USD',
    "base_price_per_day_cents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rate_tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rental_item_id" TEXT NOT NULL,
    "min_days" INTEGER NOT NULL,
    "price_per_day_cents" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "rate_tiers_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rental_item_id" TEXT NOT NULL,
    "order_id" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "customer_email" TEXT,
    "customer_name" TEXT,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
