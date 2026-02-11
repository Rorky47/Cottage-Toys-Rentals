# Troubleshooting RESERVED → CONFIRMED Status Not Updating

## Possible causes:

### 1. ORDERS_PAID webhook not registered
- Shopify requires "protected customer data" approval for ORDERS_PAID
- Check Partner Dashboard: App Setup → Event Subscriptions
- Look for ORDERS_PAID webhook status

### 2. Booking reference not in line item
- Check if `_booking_ref` is in the order line item properties
- View order in Shopify Admin → Check line item properties

### 3. Webhook failing silently
- Check Railway logs for webhook errors
- Search for "ORDERS_PAID" or "ordersPaid" in logs

## Quick diagnostics:

### Check if webhook is registered:
1. Go to Shopify Admin → Settings → Notifications → Webhooks
2. Look for "Order payment" webhook pointing to your app
3. If missing, webhook registration failed

### Check order line item properties:
1. View the test order in Shopify Admin
2. Look at line item details
3. Should see properties:
   - rental_start: 2026-02-XX
   - rental_end: 2026-02-XX
   - rental_days: X
   - _booking_ref: [UUID] (this is CRITICAL!)

### Check database:
Query bookings to see if status changed:
```sql
SELECT id, status, orderId, startDate, endDate 
FROM bookings 
WHERE status = 'RESERVED' 
ORDER BY createdAt DESC 
LIMIT 10;
```

If `_booking_ref` is missing from order → deployment issue
If webhook not registered → need protected customer data approval
If booking exists but status not updated → webhook not firing or logic issue
