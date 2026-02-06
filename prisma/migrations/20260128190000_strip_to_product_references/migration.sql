-- Drop rental app tables and replace with minimal product references
-- Shopify remains the source of truth for product data (price, inventory, etc.)

PRAGMA foreign_keys=OFF;

-- Drop rental tables (order matters due to FKs)
DROP TABLE IF EXISTS "bookings";
DROP TABLE IF EXISTS "rate_tiers";
DROP TABLE IF EXISTS "rental_items";

-- Drop rental indexes if they exist (SQLite allows dropping missing indexes with IF EXISTS)
DROP INDEX IF EXISTS "rental_items_shop_shopify_product_id_key";
DROP INDEX IF EXISTS "rate_tiers_rental_item_id_duration_type_min_duration_key";
DROP INDEX IF EXISTS "rate_tiers_rental_item_id_idx";
DROP INDEX IF EXISTS "bookings_rental_item_id_idx";
DROP INDEX IF EXISTS "bookings_start_date_end_date_idx";

-- Create product reference table
CREATE TABLE "product_references" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "shopify_product_id" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "product_references_shop_shopify_product_id_key"
  ON "product_references"("shop", "shopify_product_id");

PRAGMA foreign_keys=ON;

