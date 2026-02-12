-- Clean up duplicate RESERVED bookings that have a matching CONFIRMED booking
-- This finds RESERVED bookings with the same rentalItemId, startDate, endDate as a CONFIRMED booking
DELETE FROM bookings
WHERE id IN (
  SELECT r.id
  FROM bookings r
  INNER JOIN bookings c 
    ON r."rental_item_id" = c."rental_item_id"
    AND r."start_date" = c."start_date"
    AND r."end_date" = c."end_date"
    AND r.status = 'RESERVED'
    AND c.status = 'CONFIRMED'
    AND r.id != c.id
);

-- Show remaining bookings
SELECT 
  id,
  "rental_item_id",
  "order_id",
  "start_date",
  "end_date",
  status
FROM bookings
ORDER BY "created_at" DESC;
