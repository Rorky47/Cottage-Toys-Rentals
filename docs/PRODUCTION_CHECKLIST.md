# Production Launch Checklist

## ✅ Code Complete
- [x] GDPR webhooks configured
- [x] Secure booking reference system
- [x] Cart removal tracking
- [x] Customer-friendly property names
- [x] Code refactored and cleaned up
- [x] Debug routes removed

## 🚀 Critical Deployment Steps

### 1. Deploy Theme Extension
**This is REQUIRED for the app to work!**

```bash
cd /home/ethan/Documents/Programming/Cottage-Toys-Rentals
npm run deploy
```

This pushes all the Liquid file changes (booking reference, property names, etc.) to Shopify.

**Verify:**
- Extension appears in theme editor
- "Rental calendar" block can be added to product pages
- "Rental cart" block can be added to cart page

---

### 2. Test Complete Customer Flow

**On your dev store:**

1. **Add rental calendar to product:**
   - Theme editor → Product template
   - Add "Rental calendar" app block
   - Save

2. **Create test booking:**
   - Visit product page
   - Select rental dates
   - Click "Add to rental cart"
   - Complete checkout with test payment

3. **Verify booking confirmation:**
   - Check app calendar → should show CONFIRMED booking
   - Check Shopify order → should have rental properties:
     - Rental Start Date: YYYY-MM-DD
     - Rental Return Date: YYYY-MM-DD
     - Rental Duration: X days
     - _booking_ref: [hidden UUID]

4. **Test cart removal:**
   - Add rental to cart
   - Remove from cart
   - Check Railway logs → should see unreserve call

**Expected Results:**
- ✅ Booking shows in calendar immediately after payment
- ✅ Order email shows rental dates clearly
- ✅ Cart removal deletes reservation

---

### 3. Verify Webhooks

**Check Shopify Admin:**
- Settings → Notifications → Webhooks
- Should see webhook for "Order payment" pointing to your app

**If missing:**
- ORDERS_PAID webhook needs "protected customer data" approval
- Request in Partner Dashboard → App Setup → Protected Customer Data

**Test in Railway logs:**
```bash
# Search for:
- "ORDERS_PAID" - webhook firing
- "ordersPaid" - handler executing
- "booking" - database updates
```

---

### 4. Database Cleanup (Optional but Recommended)

**Remove test data:**
```sql
-- Connect to production DB
-- Delete expired test reservations
DELETE FROM "Booking" WHERE status = 'RESERVED' AND "expiresAt" < NOW();

-- Verify no orphaned data
SELECT * FROM "Booking" WHERE status = 'RESERVED';
```

---

### 5. App Store Listing Requirements

**Partner Dashboard → Apps → NDS : RentalRates → Distribution**

### Required Content:

**✅ App Introduction** (100 chars)
```
Enable daily product rentals with flexible pricing, booking calendar, and automatic inventory management for rental businesses.
```

**✅ App Card Subtitle** (62 chars)
```
Daily rentals with flexible pricing and booking calendar
```

**✅ Features** (5 features, 80 chars each)
```
1. Flexible daily rental pricing with automatic tier discounts
2. Visual booking calendar shows confirmed and reserved dates
3. Automatic inventory tracking prevents double-bookings
4. Secure cart holds with 45-minute reservation windows
5. Seamless Shopify checkout with rental dates in order emails
```

**📸 Screenshots** (Required)
1. Product page with rental calendar (customer view)
2. App dashboard showing rental items
3. Booking calendar with confirmed reservations
4. Pricing configuration (flat vs tiered)
5. Order confirmation with rental dates

**🎥 Screencast** (Required - 3-8 minutes)
Record with OBS/QuickTime:
1. **Merchant Setup** (2 min)
   - Install app
   - Add product to rentals
   - Configure pricing/inventory
   - Add calendar block to theme

2. **Customer Experience** (2 min)
   - Browse product
   - Select rental dates
   - See dynamic pricing
   - Complete checkout

3. **Booking Management** (1 min)
   - View calendar
   - See confirmed bookings
   - Show rental details

**📝 Testing Instructions**
```markdown
# Testing Instructions for NDS : RentalRates

## Installation
1. Install app from Shopify Admin
2. OAuth flow completes automatically
3. Redirects to app dashboard

## Theme Setup (REQUIRED)
4. Go to: Online Store → Themes → Customize
5. Navigate to a product page template
6. Click "Add block" → Select "Rental calendar" (from NDS : RentalRates)
7. Position the block where customers should select dates
8. Save theme

## Configure Rental Product
9. In app dashboard, use search bar to find a product
10. Product auto-enables with Shopify's default price
11. Adjust daily rate and available inventory as needed
12. (Optional) Switch to "Tiered" pricing for volume discounts

## Test Customer Checkout
13. Visit the product page on your storefront
14. See the "Rental calendar" date picker
15. Select start date and return date
16. Price updates dynamically based on duration
17. Click "Add to rental cart"
18. Complete checkout with test payment

## View Bookings
19. Return to app → Click "Rental calendar" tab
20. Booking appears as green bar (confirmed)
21. Hover to see rental details

## Notes
- Theme app block MUST be added for calendar to appear
- Only completed orders create permanent bookings
- Cart holds expire after 45 minutes if checkout not completed
- All data isolated per store (multi-tenant safe)
```

---

## 6. App Store Compliance Checks

**Verify in Partner Dashboard:**

- [x] App authenticates immediately after install
- [x] Redirects to app UI after authentication
- [x] GDPR webhooks configured (customers/data_request, customers/redact, shop/redact)
- [x] Valid TLS certificate (Railway provides)
- [x] Webhook HMAC verification (implemented)

**Test:**
```bash
# Test webhook signatures
curl -X POST https://cottage-toys-rentals-production.up.railway.app/webhooks/customers/data_request \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  # Should return 401 without valid HMAC
```

---

## 7. Final Pre-Submission Checks

**Code:**
- [x] All commits pushed to GitHub
- [x] Theme extension deployed to Shopify
- [x] Railway deployment successful
- [x] Environment variables set correctly

**Testing:**
- [ ] Full booking flow works (RESERVED → CONFIRMED)
- [ ] Calendar shows bookings after payment
- [ ] Cart removal deletes reservations
- [ ] Order emails show rental dates clearly
- [ ] Multi-store data isolation verified

**Content:**
- [ ] Screenshots uploaded (5 required)
- [ ] Screencast recorded and uploaded
- [ ] Testing instructions complete
- [ ] Privacy policy URL set
- [ ] Support email configured

---

## 8. Submit for Review

**Partner Dashboard:**
1. Apps → NDS : RentalRates → Distribution
2. Complete all required fields
3. Click "Submit for review"

**Timeline:**
- Initial review: 3-5 business days
- Revisions (if needed): 1-2 days per iteration
- Approval: App goes live immediately

---

## 🚨 Common Rejection Reasons to Avoid

1. ❌ **Missing theme setup instructions** → We documented this!
2. ❌ **Webhooks not working** → Test ORDERS_PAID thoroughly
3. ❌ **Poor demo video** → Show full merchant + customer flow
4. ❌ **GDPR webhooks missing** → Already configured ✅
5. ❌ **Broken authentication** → Test OAuth flow

---

## 📞 Support & Troubleshooting

**If bookings don't appear:**
1. Check Railway logs for ORDERS_PAID webhook
2. Verify theme extension is deployed
3. Check order line item properties for _booking_ref
4. Ensure Protected Customer Data approved

**If calendar doesn't show:**
1. Verify "Rental calendar" block added to product template
2. Check that product is tracked in app dashboard
3. Confirm dates selected are in future

**Database queries:**
```sql
-- Check bookings
SELECT * FROM "Booking" ORDER BY "createdAt" DESC LIMIT 10;

-- Check rental items
SELECT * FROM "RentalItem" WHERE shop = 'your-store.myshopify.com';
```

---

## ✨ You're Ready!

Once you complete:
1. ✅ Theme extension deployed
2. ✅ End-to-end test passes
3. ✅ Screenshots/screencast uploaded
4. ✅ Testing instructions written

**Click "Submit for Review" in Partner Dashboard!**

Good luck! 🚀
