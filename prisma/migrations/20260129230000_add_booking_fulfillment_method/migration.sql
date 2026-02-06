-- Track whether a confirmed booking is shipping vs store pickup.
-- Default UNKNOWN for existing bookings.

ALTER TABLE "bookings" ADD COLUMN "fulfillment_method" TEXT NOT NULL DEFAULT 'UNKNOWN';

