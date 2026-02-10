# Update Railway with New App Credentials

## ✅ NEW APP CREATED!

Your new public app "NDS:RentalRates" has been created and deployed!

**New Client ID:** `ba53093f3116c25858a8338c16e365c7`

---

## Get the API Secret

1. Go to Partner Dashboard: https://partners.shopify.com/129136928/apps
2. Click on **"NDS:RentalRates"** (the NEW one, not the old custom app)
3. Click **"Overview"** in left sidebar
4. Scroll to **"Client credentials"**
5. Click **"Show"** next to "Client secret"
6. **Copy the secret** (it's a long string)

---

## Update Railway Environment Variables

### Method 1: Railway Dashboard (Easiest)
1. Go to: https://railway.app/project/...
2. Click your **service** (cottage-toys-rentals-production)
3. Click **"Variables"** tab
4. Find and update these TWO variables:
   - `SHOPIFY_API_KEY` = `ba53093f3116c25858a8338c16e365c7`
   - `SHOPIFY_API_SECRET` = (paste the secret you copied)
5. Click **"Deploy"** or wait for auto-deploy

### Method 2: Railway CLI
```bash
railway variables set SHOPIFY_API_KEY=ba53093f3116c25858a8338c16e365c7
railway variables set SHOPIFY_API_SECRET=<paste_secret_here>
```

---

## After Updating Railway

Wait 2-3 minutes for Railway to redeploy, then:

### Test the New App

1. Go to Partner Dashboard → NDS:RentalRates
2. Click **"Test on development store"**
3. Select cottage-toys-canada or create a new test store
4. Click **"Install"**
5. The app will install with the new credentials
6. Test the workflow:
   - Create a rental item
   - View calendar
   - Add item to cart on storefront
   - **Check checkout pricing** - it should calculate correctly now!

---

## Why This Works

The new app is created as **PUBLIC** distribution (not custom), so:
- ✅ Cart transform functions work on ALL plans
- ✅ No Shopify Plus required
- ✅ Can be submitted to App Store
- ✅ Pricing will calculate at checkout

---

## Verification Checklist

After updating Railway and testing:

- [ ] Railway variables updated (API key + secret)
- [ ] Railway redeployed successfully
- [ ] New app installed on test store
- [ ] Can create rental items
- [ ] Calendar displays
- [ ] Product page shows date picker
- [ ] Add to cart works
- [ ] **Checkout shows CORRECT rental price** (not base price)
- [ ] Order completes successfully
- [ ] Booking appears in calendar

If all checks pass, you're ready to submit for App Store review!

---

## Next Steps After Testing

1. Create app icon (512x512px)
2. Take 3-5 screenshots
3. Fill out app listing in Partner Dashboard
4. Submit for review
5. Wait 5-7 days for approval
6. 🎉 You have a published Shopify app!

---

## Need the Secret Again?

Partner Dashboard → Apps → NDS:RentalRates → Overview → Client credentials → Show
