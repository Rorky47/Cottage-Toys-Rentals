# NDS:RentalRates Setup Guide

## Installation

1. Visit the Shopify App Store and search for "NDS:RentalRates"
2. Click **Add app** to install
3. Approve the required permissions
4. You'll be redirected to the app dashboard

## Quick Start

### Step 1: Create Your First Rental Item

1. In your Shopify Admin, go to **Apps > NDS:RentalRates**
2. Click **New Rental Item**
3. Select a product from your store
4. Set the **Base Price Per Day** (e.g., $50.00)
5. Click **Save**

Your product now supports rentals!

### Step 2: Add Pricing Tiers (Optional)

Reward longer rentals with discounted rates:

1. Edit your rental item
2. Under **Pricing Tiers**, click **Add Tier**
3. Set minimum days (e.g., 7 days)
4. Set discounted price per day (e.g., $40.00)
5. Add more tiers if needed (e.g., 30+ days = $30/day)

**Example:**
- 1-6 days: $50/day
- 7-29 days: $40/day
- 30+ days: $30/day

### Step 3: View Your Calendar

1. Click **Calendar** in the app
2. See all upcoming rentals
3. Use month navigation to browse dates
4. Bookings appear automatically when customers checkout

### Step 4: Test on Your Storefront

1. Visit the product page on your live store
2. You'll see a rental date picker
3. Select start and end dates
4. Watch the price calculate in real-time
5. Add to cart and proceed to checkout
6. The checkout price reflects your rental duration

## Key Features Explained

### Calendar View

The calendar shows:
- **Green dates**: Rental is booked
- **Navigate months**: Use arrows to move forward/backward
- **View details**: Click a date to see booking info

### Pricing Calculation

Prices calculate automatically:
```
Total Price = Daily Rate × Number of Days × Tier Multiplier
```

**Example:**
- Base rate: $50/day
- Rental: Feb 9 to Feb 28 (20 days)
- 7+ day tier: $40/day
- Total: $40 × 20 = $800

### Product Integration

The app adds:
- Date picker to product pages
- Real-time price preview
- "Add to Cart" button integration
- Rental attributes in checkout

## Common Workflows

### Managing Bookings

1. Check your calendar for upcoming rentals
2. Rentals appear after customers complete checkout
3. You'll see: customer, dates, product, price
4. Mark items as returned in your order management

### Blocking Dates

To prevent bookings on certain dates:
1. Create a "dummy" reservation in your admin
2. Or mark items out of stock temporarily
3. Calendar respects inventory availability

### Modifying Prices

To change pricing:
1. Go to app dashboard
2. Edit the rental item
3. Update base price or tiers
4. Changes apply immediately to new reservations

### Adding More Products

1. Click **New Rental Item**
2. Select any product
3. Set pricing
4. Product is now rentable

## Troubleshooting

### Date picker doesn't appear on product page

**Solution:**
- Ensure the product has rental pricing set in the app
- Clear browser cache and refresh
- Check that product has the rental metafield

### Price not calculating correctly in checkout

**Solution:**
- After publishing the app, the cart transform function needs to be active
- It activates automatically on install for public apps
- Test in a fresh cart to verify

### Calendar not showing bookings

**Solution:**
- Bookings appear after orders are marked as "paid"
- Check that the order completed successfully
- Verify the ORDERS_PAID webhook is registered

### Can't select certain dates

**Solution:**
- Check product inventory - items must be in stock
- Verify no overlapping bookings exist
- Ensure dates are in the future

## Advanced Configuration

### Custom Metafields

The app uses these metafields:
- `cottage_rentals.pricing` - Stores pricing config
- `cottage_rentals.rental_enabled` - Marks product as rentable

### Webhooks

The app registers these webhooks automatically:
- `ORDERS_PAID` - Creates rental reservations
- `CUSTOMERS_DATA_REQUEST` - GDPR compliance
- `CUSTOMERS_REDACT` - GDPR deletion
- `SHOP_REDACT` - Cleanup on uninstall

## Support

Need help?
- **Email:** ethanrork14@gmail.com
- **Response time:** Within 24 hours
- **Include:** Store domain, product ID, and screenshots if applicable

## Privacy & Data

Read our [Privacy Policy](https://cottage-toys-rentals-production.up.railway.app/privacy) for details on:
- What data we collect
- How it's used
- GDPR compliance
- Data deletion
