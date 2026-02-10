# Creating New Public App - Step by Step Guide

## Part 1: Create the App (Do This Now)

### Step 1: Go to Partner Dashboard
1. Open: https://partners.shopify.com/129136928/apps
2. Click the green **"Create app"** button (top right)

### Step 2: Choose App Type
1. Select **"Create app manually"**
2. App name: **NDS:RentalRates**
3. Click **"Create"**

### Step 3: Basic Configuration

#### App URL Configuration
1. Click **"Configuration"** in the left sidebar
2. Under **"App URL"**, enter:
   ```
   https://cottage-toys-rentals-production.up.railway.app
   ```

#### Allowed Redirection URLs
3. Under **"Allowed redirection URL(s)"**, add BOTH:
   ```
   https://cottage-toys-rentals-production.up.railway.app/auth/callback
   https://cottage-toys-rentals-production.up.railway.app/auth/shopify/callback
   ```
   (Click "+ Add" after each one)

4. Click **"Save"** at the top

### Step 4: App Proxy Configuration
1. Still in **"Configuration"** section
2. Scroll down to **"App proxy"**
3. Click **"Set up"**
4. Fill in:
   - **Subpath prefix:** `apps`
   - **Subpath:** `nds-rentalrates-app`
   - **Proxy URL:** `https://cottage-toys-rentals-production.up.railway.app/apps/nds-rentalrates-app`
5. Click **"Save"**

### Step 5: Get API Credentials
1. Click **"Overview"** in left sidebar
2. Look for **"Client credentials"** section
3. You'll see:
   - **Client ID** (this is your API key)
   - **Client secret** (click "Show" to reveal)
4. **COPY BOTH** - you'll need them next!

---

## Part 2: Update Railway Environment Variables

Once you have the new credentials, reply with:
- "I have the credentials"

And I'll help you update Railway with them.

---

## Part 3: Configure OAuth Scopes (After Railway Update)

After updating Railway, go back to Partner Dashboard:
1. Click **"Configuration"** → **"App access"**
2. Click **"Configure"** under Admin API access scopes
3. Select these scopes:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders`
   - ✅ `write_orders`
   - ✅ `read_product_listings`
   - ✅ `read_customers`
   - ✅ `write_customers`
4. Click **"Save"**

---

## Part 4: Extension Configuration

1. In Partner Dashboard, click **"Extensions"** in left sidebar
2. You should see **"Cart price multiplier"** listed
3. If not, we'll need to deploy it:
   ```bash
   shopify app deploy
   ```

---

## Part 5: Test Installation

1. Create or use a development store
2. In Partner Dashboard, click **"Test on development store"**
3. Select your test store
4. Click **"Install app"**
5. Test the complete workflow

---

## Part 6: Fill Out App Listing

1. Click **"Distribution"** in left sidebar
2. Make sure it says **"Public"**
3. Click **"App listing"**
4. Fill in all required fields (use docs/app-store-listing.md for content)
5. Upload icon and screenshots
6. Click **"Save"**

---

## Part 7: Submit for Review

1. Once everything is filled out
2. Click **"Submit for review"**
3. Wait 5-7 days
4. Respond to any Shopify feedback
5. Get approved! 🎉

---

## Ready to Start?

**Right now, complete Part 1** (creating the app in Partner Dashboard).

When you're done, reply with:
- "Created - here are my credentials: [Client ID] and [Client Secret]"

And I'll update Railway for you!
