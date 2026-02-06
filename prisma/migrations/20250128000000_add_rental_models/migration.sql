-- CreateTable (no UNIQUE in table def - we add named indexes below so SQLite won't create sqlite_autoindex_*)
CREATE TABLE "rental_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopify_product_id" TEXT NOT NULL,
    "name" TEXT,
    "image_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "rate_tiers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rental_item_id" TEXT NOT NULL,
    "duration_type" TEXT NOT NULL,
    "min_duration" INTEGER NOT NULL,
    "price" REAL NOT NULL,
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
    "status" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_name" TEXT,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "bookings_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Named unique indexes (avoids sqlite_autoindex_* that Prisma later tries to drop)
CREATE UNIQUE INDEX "rental_items_shop_shopify_product_id_key" ON "rental_items"("shop", "shopify_product_id");
CREATE UNIQUE INDEX "rate_tiers_rental_item_id_duration_type_min_duration_key" ON "rate_tiers"("rental_item_id", "duration_type", "min_duration");

-- Non-unique indexes
CREATE INDEX "rate_tiers_rental_item_id_idx" ON "rate_tiers"("rental_item_id");
CREATE INDEX "bookings_rental_item_id_idx" ON "bookings"("rental_item_id");
CREATE INDEX "bookings_start_date_end_date_idx" ON "bookings"("start_date", "end_date");
