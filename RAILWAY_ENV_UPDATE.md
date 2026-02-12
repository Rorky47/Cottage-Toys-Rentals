# Railway Environment Variable Update Needed

## Current Issue
Environment variable is named `RENTALRATES_DATABASE_URL` but needs to be `DATABASE_URL`

## How to Fix on Railway

1. **Go to Railway Dashboard:**
   - Visit: https://railway.app
   - Navigate to your project: "Shopify-Rental-Rates"
   - Select the "production" environment

2. **Update Environment Variable:**
   - Go to **Variables** tab
   - Find `RENTALRATES_DATABASE_URL`
   - **Option A (Recommended):** Rename it
     - Click on the variable
     - Change name from `RENTALRATES_DATABASE_URL` to `DATABASE_URL`
     - Save
   
   - **Option B:** Add new variable
     - Add new variable: `DATABASE_URL`
     - Copy the value from `RENTALRATES_DATABASE_URL`
     - Delete old `RENTALRATES_DATABASE_URL`

3. **Redeploy:**
   - Railway should auto-redeploy after variable change
   - Or manually trigger: `npm run deploy`

## What the Code Expects

From `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## Railway CLI Method (Alternative)

```bash
cd ~/Documents/Programming/Cottage-Toys-Rentals

# Check current variables
railway variables

# Set the correct variable (if Railway CLI is linked)
railway variables --set DATABASE_URL="<your_database_url_value>"

# Remove old variable
railway variables --unset RENTALRATES_DATABASE_URL
```

## Note
The `.env.example` file already has the correct variable name (`DATABASE_URL`).
This change is only needed in Railway's production environment variables.
