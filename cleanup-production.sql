-- Production Database Cleanup Script
-- Run this to clean up test data before launch

-- 1. Delete duplicate RESERVED bookings (where CONFIRMED exists for same dates)
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

-- 2. Delete expired RESERVED bookings (older than 1 hour)
DELETE FROM bookings
WHERE status = 'RESERVED'
  AND "expires_at" < NOW() - INTERVAL '1 hour';

-- 3. (OPTIONAL) Delete ALL test bookings if you want to start fresh
-- Uncomment the lines below ONLY if you want to delete everything
-- DELETE FROM bookings;
-- DELETE FROM rate_tiers;
-- DELETE FROM rental_items;
-- DELETE FROM product_references;

-- 4. Show what's left
SELECT 
  'bookings' as table_name,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'CONFIRMED') as confirmed,
  COUNT(*) FILTER (WHERE status = 'RESERVED') as reserved
FROM bookings
UNION ALL
SELECT 
  'rental_items',
  COUNT(*),
  NULL,
  NULL
FROM rental_items
UNION ALL
SELECT 
  'product_references',
  COUNT(*),
  NULL,
  NULL
FROM product_references;

-- 5. Verify data integrity
SELECT 
  'Orphaned bookings' as issue,
  COUNT(*) as count
FROM bookings b
LEFT JOIN rental_items ri ON b."rental_item_id" = ri.id
WHERE ri.id IS NULL;
