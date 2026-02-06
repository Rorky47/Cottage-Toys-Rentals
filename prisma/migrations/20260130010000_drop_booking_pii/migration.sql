-- Remove customer PII from bookings (email/name).
-- We only store reservation status and fulfillment method.

ALTER TABLE "bookings" DROP COLUMN "customer_email";
ALTER TABLE "bookings" DROP COLUMN "customer_name";

