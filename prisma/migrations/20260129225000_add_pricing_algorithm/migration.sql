-- Add pricing algorithm to RentalItem so UI can toggle FLAT/TIERED
-- without relying on presence/absence of tiers.

ALTER TABLE "rental_items" ADD COLUMN "pricing_algorithm" TEXT NOT NULL DEFAULT 'FLAT';

-- If an item already has tiers, treat it as tiered.
UPDATE "rental_items"
SET "pricing_algorithm" = 'TIERED'
WHERE "id" IN (SELECT DISTINCT "rental_item_id" FROM "rate_tiers");

