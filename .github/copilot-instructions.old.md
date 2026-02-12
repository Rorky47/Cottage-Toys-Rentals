# Cottage Toys Rentals - Copilot Instructions

## Project Overview

**Cottage Toys Rentals** is an embedded Shopify app for managing rental product inventory and availability. The app tracks rental bookings, calculates dynamic pricing based on rental duration, and integrates with Shopify's checkout flow.

### Tech Stack
- **Framework**: Remix (React-based full-stack framework)
- **Runtime**: Node.js (>=20.19 <22 || >=22.12)
- **Database**: PostgreSQL with Prisma ORM
- **Hosting**: Railway (production)
- **Shopify Integration**: Shopify App Remix, App Bridge React
- **UI**: Shopify Polaris components
- **Testing**: Vitest
- **Build Tool**: Vite
- **Type System**: TypeScript

---

## Project Structure

```
cottage-toys-rental/
├── app/                          # Remix application code
│   ├── routes/                   # File-based routing
│   │   ├── app/                  # Admin UI routes (requires auth)
│   │   ├── auth/                 # OAuth authentication flows
│   │   ├── webhooks/             # Shopify webhook handlers
│   │   └── apps.nds-rentalrates-app.$proxy.tsx  # Storefront proxy endpoint
│   ├── rental/                   # Core rental domain logic
│   │   ├── availability.server.ts    # Availability checking
│   │   ├── booking.ts                # Booking models/utilities
│   │   ├── pricing.server.ts         # Pricing calculations
│   │   ├── pricingMetafield.server.ts # Shopify metafield sync
│   │   ├── cleanup.server.ts         # Expired booking cleanup
│   │   ├── cache.server.ts           # Caching layer
│   │   └── proxy/                    # Storefront API endpoints
│   ├── features/                 # Feature-specific code
│   ├── shopify/                  # Shopify SDK setup & utilities
│   ├── db.server.ts             # Prisma client singleton
│   └── shopify.server.ts        # Shopify app configuration
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── migrations/              # Database migrations
├── extensions/                   # Shopify app extensions
│   ├── price-input/             # Admin UI extension for pricing
│   └── cart-multiplier-function/ # Checkout function for rental logic
├── docs/                        # Documentation
├── scripts/                     # Utility scripts
└── public/                      # Static assets
```

---

## Core Domain Models (Prisma)

### RentalItem
Represents a Shopify product configured for rental. The app syncs pricing to Shopify metafields.
- **Fields**: `shopifyProductId`, `name`, `basePricePerDayCents`, `pricingAlgorithm`, `quantity`
- **Relations**: `rateTiers[]`, `bookings[]`
- **Pricing Algorithms**: `FLAT` (single rate) or `TIERED` (volume discounts)

### Booking
Tracks rental reservations with date ranges.
- **Fields**: `rentalItemId`, `orderId`, `startDate`, `endDate`, `units`, `status`, `fulfillmentMethod`
- **Statuses**: `RESERVED`, `CONFIRMED`, `CANCELLED`, `RETURNED`
- **Fulfillment**: `SHIP`, `PICKUP`, `UNKNOWN`

### RateTier
Defines tiered pricing rules (e.g., $10/day for 1-3 days, $8/day for 4+ days).
- **Fields**: `rentalItemId`, `minDays`, `pricePerDayCents`

### ShopSettings
Per-shop configuration (privacy acceptance, etc.).

---

## Key Features & Workflows

### 1. Rental Pricing Calculation
**Location**: `app/rental/pricing.server.ts`

Calculates rental price based on:
- Rental duration (days)
- Pricing algorithm (FLAT vs TIERED)
- Rate tiers (volume discounts)

Used by:
- Storefront proxy API (real-time pricing)
- Shopify metafield sync (display pricing in product pages)

### 2. Availability Checking
**Location**: `app/rental/availability.server.ts`

Checks if a rental item is available for a given date range:
- Queries existing bookings with overlapping dates
- Accounts for quantity (multiple units of same item)
- Filters out CANCELLED/RETURNED bookings
- Returns available units and conflicts

### 3. Booking Management
**Workflow**:
1. Customer selects dates on storefront (via theme integration)
2. Storefront calls proxy endpoint to validate availability
3. On checkout, webhook creates/confirms booking
4. Admin can manage bookings via admin UI routes

**Expiration**: Bookings with `expiresAt` are cleaned up by scheduled task (see `cleanup.server.ts`)

### 4. Shopify Integration

#### Metafields
The app writes pricing data to Shopify product metafields so themes can display rental rates without API calls.

**Location**: `app/rental/pricingMetafield.server.ts`

#### Extensions
- **price-input**: Admin UI extension for configuring rental pricing (embedded in product edit page)
- **cart-multiplier-function**: Checkout function that applies rental duration multipliers

#### Webhooks
**Location**: `app/routes/webhooks/`

Handles Shopify events (e.g., `orders/create`, `products/update`)

---

## Routing Conventions

### Admin Routes (`app/routes/app/*`)
Require Shopify OAuth authentication. Render Polaris UI for merchants.

**Examples**:
- `app._index` → Dashboard
- `app.search-products` → Product search UI
- `app/$page` → Dynamic admin pages

### Storefront Proxy (`apps.nds-rentalrates-app.$proxy.tsx`)
Public API for theme/storefront to fetch rental data (availability, pricing).

**Pattern**: `https://{shop}/apps/nds-rentalrates-app/{endpoint}`

### Webhooks (`webhooks/$topic/$subtopic.tsx`)
Handle Shopify webhook events. No UI, return JSON responses.

---

## Environment Variables

**Required**:
- `SHOPIFY_API_KEY` – App client ID (from Partners dashboard)
- `SHOPIFY_API_SECRET` – App client secret
- `SHOPIFY_APP_URL` – Public app URL (e.g., Railway URL)
- `SCOPES` – Comma-separated OAuth scopes (e.g., `read_products,write_products`)
- `DATABASE_URL` – PostgreSQL connection string

**Optional**:
- `SHOP_CUSTOM_DOMAIN` – Custom shop domain override

---

## Development Commands

```bash
npm run dev              # Start dev server (Shopify CLI tunnel)
npm run build            # Build for production
npm run start            # Start production server
npm run setup            # Generate Prisma client & run migrations
npm run deploy           # Deploy to Shopify (extensions + app)
npm run lint             # ESLint
npm run test             # Run Vitest tests
npm run prisma           # Prisma CLI
```

---

## Code Style & Conventions

### File Naming
- **Routes**: Use Remix flat routes convention (`.` for nesting, `_` for layout routes)
- **Server-only**: Files ending in `.server.ts` run server-side only
- **Tests**: Co-located `*.test.ts` files

### TypeScript
- Strict mode enabled
- Use domain models from `app/rental/booking.ts`, `app/types/`
- Shopify types from `@shopify/shopify-app-remix`

### Database
- Use Prisma Client from `app/db.server.ts` (singleton pattern)
- Always use snake_case for table/column names (`@map` decorators in schema)
- Transactions for multi-step booking operations

### Shopify API
- GraphQL queries via `shopify.admin.graphql()` (authenticated)
- Use `@shopify/app-bridge-react` for admin UI
- Polaris components for consistent merchant experience

---

## Deployment

### Railway (Production)
1. Set environment variables in Railway dashboard
2. Automatic deploy on git push (connected to main branch)
3. Run `setup` script on first deploy (migrations)
4. Set `SHOPIFY_APP_URL` to Railway URL in Partner Dashboard

### Shopify Partners
- Distribution: Public (App Store-ready)
- Configure OAuth redirects to Railway URL
- Extensions auto-deploy via `npm run deploy`

---

## Common Tasks

### Adding a New Rental Feature
1. Update `prisma/schema.prisma` if new data needed
2. Run `npx prisma migrate dev --name <migration_name>`
3. Add business logic to `app/rental/`
4. Create route in `app/routes/app/` for admin UI
5. Update storefront proxy if needed (`apps.nds-rentalrates-app.$proxy.tsx`)

### Updating Pricing Logic
1. Modify `app/rental/pricing.server.ts`
2. Update tests in `app/rental/__tests__/`
3. Sync metafields via `pricingMetafield.server.ts`

### Adding Webhook Handler
1. Create `app/routes/webhooks/{topic}/{subtopic}.tsx`
2. Return `{ ok: true }` or error JSON
3. Register webhook in `app/shopify.server.ts` if not auto-registered

---

## Important Notes

- **Shopify is source of truth** for product data (price, inventory, etc.). The app only tracks rental-specific logic.
- **Date ranges are inclusive**: `startDate` and `endDate` both count as rental days.
- **Booking conflicts**: Use `availability.server.ts` to check before creating bookings.
- **Cleanup task**: Expired bookings are deleted via scheduled job (see `cleanup.server.ts`).
- **Caching**: Availability queries are cached (see `cache.server.ts`) to reduce DB load.

---

## Troubleshooting

### Development
- If OAuth fails, check `SHOPIFY_APP_URL` matches dev tunnel URL
- If database errors, run `npm run setup` to regenerate Prisma client
- Clear cache with `rm -rf node_modules/.cache`

### Production
- Check Railway logs for startup errors
- Verify all env vars are set (app won't start without them)
- Test webhooks with Shopify webhook tester in Partner Dashboard

---

## Documentation

See `/docs` for additional guides:
- `setup-guide.md` – Initial setup instructions
- `PRODUCTION_CHECKLIST.md` – Pre-launch checklist
- `app-store-listing.md` – App Store submission details
- `troubleshooting/` – Common issues and fixes
