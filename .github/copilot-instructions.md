# Cottage Toys Rentals - Copilot Instructions

**Last Updated**: February 17, 2026  
**Stack**: Remix v2 + Shopify App + Prisma + Vitest  
**Architecture**: Clean Architecture with Domain-Driven Design  
**Migration Status**: ✅ Complete

---

## Build, Test, and Lint

### Development
```bash
npm run dev              # Start Shopify CLI dev server (port 3000)
npm run build            # Production build
npm run start            # Run production build
```

### Testing
```bash
npm run test             # Run all tests (60+ tests via Vitest)
npm run test -- path/to/file.test.ts  # Run specific test file
```

### Linting
```bash
npm run lint             # ESLint with Remix config
```

### Database
```bash
npm run prisma           # Prisma CLI
npx prisma migrate dev   # Create and apply migration
npx prisma studio        # Open Prisma Studio
```

---

## Architecture Overview

### Clean Architecture + DDD
Implemented across 4 domains:
- **Booking** - Rental reservations and availability
- **Rental** - Product configuration and inventory
- **Pricing** - Price calculations and tiered rates
- **Shop** - Shop settings and privacy configuration

### Directory Structure
```
app/
├── domains/{booking|rental|pricing|shop}/
│   ├── domain/
│   │   ├── entities/          # Business logic and rules
│   │   └── events/            # Domain events
│   ├── application/
│   │   └── useCases/          # Orchestration layer
│   ├── infrastructure/
│   │   └── repositories/      # Data access (Prisma)
│   └── presentation/          # DTOs and HTTP contracts
├── routes/                    # Remix routes (see routing section)
├── shared/
│   ├── container.ts           # DI container factory
│   ├── kernel/                # Result, Money, etc.
│   └── testing/               # Test factories and mocks
└── shopify.server.ts          # Shopify API setup

extensions/
├── price-input/               # Admin UI extension
└── cart-multiplier-function/  # Shopify Function
```

### Key Principles
1. **DTOs are interfaces** - Never use `new SomeDto(...)`
2. **Container is factory** - Use `createContainer()` not `container`
3. **Result pattern** - Check `isSuccess` before accessing `value`
4. **Thin controllers** - Business logic in entities/use cases
5. **Repository pattern** - Return domain entities, not Prisma types
6. **No direct Prisma in routes** - Always use repositories via use cases

---

## Usage Patterns

### Route Handler Template
```typescript
export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  
  const container = createContainer();
  const useCase = container.getSomeUseCase();
  const result = await useCase.execute({ /* input */ });
  
  if (result.isFailure) {
    return json({ error: result.error }, { status: 400 });
  }
  
  return json(result.value);
};
```

### Use Case Template
```typescript
export class SomeUseCase {
  constructor(private repository: IRepository) {}
  
  async execute(input: SomeInput): Promise<Result<SomeOutput>> {
    // 1. Validate
    if (!input.field) return Result.fail("Required");
    
    // 2. Fetch entity
    const entity = await this.repository.findById(input.id);
    if (!entity) return Result.fail("Not found");
    
    // 3. Business logic (via entity method)
    const result = entity.doSomething(input.data);
    if (result.isFailure) return result;
    
    // 4. Persist
    await this.repository.save(entity);
    
    // 5. Return
    return Result.ok({ success: true });
  }
}
```

---

## Domain Use Cases Reference

### Booking Domain
- `CheckAvailabilityUseCase` - Verify item available for date range
- `CreateBookingUseCase` - New RESERVED booking (storefront)
- `CreateConfirmedBookingUseCase` - Direct CONFIRMED booking (admin)
- `ConfirmBookingByIdUseCase` - Confirm by exact ID
- `PromoteBookingByDatesUseCase` - Confirm by date match (webhook)
- `DeleteReservationUseCase` - Delete RESERVED booking
- `GetCalendarBookingsUseCase` - Admin calendar view
- `UpdateBookingStatusUseCase` - Admin status updates
- `CleanupExpiredBookingsUseCase` - Remove expired reservations
- `CancelReservedBookingsByRentalItemUseCase` - Bulk cancel by item

### Rental Domain
- `TrackProductUseCase` - Enable product as rental
- `UpdateRentalBasicsUseCase` - Update price/quantity
- `GetRentalItemsForDashboardUseCase` - Admin dashboard list
- `UpsertRentalItemUseCase` - Sync from Shopify (webhook)
- `DeleteRentalItemUseCase` - Remove rental configuration

### Pricing Domain
- `CalculatePricingUseCase` - Calculate price with tiered rates

### Shop Domain
- Simple CRUD operations (intentionally NOT using use cases)

---

## Container Methods

```typescript
const container = createContainer();

// Booking
container.getCheckAvailabilityUseCase()
container.getCreateBookingUseCase()
container.getDeleteReservationUseCase()
container.getGetCalendarBookingsUseCase()
container.getUpdateBookingStatusUseCase()

// Rental
container.getTrackProductUseCase(adminApi)
container.getUpdateRentalBasicsUseCase(adminApi)
container.getGetRentalItemsForDashboardUseCase()

// Pricing
container.getCalculatePricingUseCase()

// Repositories
container.getBookingRepository()
container.getRentalItemRepository()
```

---

## Common Mistakes

### ❌ Wrong: DTO as Class
```typescript
const input = new CreateBookingInput(...);  // CRASH!
```

### ✅ Correct: DTO as Object Literal
```typescript
const input: CreateBookingInput = {
  field: "value"
};
```

### ❌ Wrong: Import Container Object
```typescript
import { container } from "~/shared/container";  // Doesn't exist!
```

### ✅ Correct: Use Factory
```typescript
import { createContainer } from "~/shared/container";
const container = createContainer();
```

### ❌ Wrong: Access Value Without Check
```typescript
const data = result.value;  // Might be undefined!
```

### ✅ Correct: Check First
```typescript
if (result.isSuccess) {
  const data = result.value;
}
```

---

## Migration Status

### ✅ Fully Migrated to Clean Architecture
- All booking operations (availability, CRUD, confirmation)
- All rental operations (tracking, updates, sync)
- All pricing calculations (tiered rates)
- Storefront API routes (quote, reserve, unreserve)
- Admin dashboard and calendar
- Webhooks (ordersPaid, GDPR, app lifecycle)

### ⚠️ Intentional Exceptions
**Direct Prisma usage allowed only for**:
- Shop privacy settings CRUD (simple, no business logic)
- ProductReference legacy feature (scheduled for removal)

These exceptions are documented and acceptable.

**Migration achievement**: 8 Prisma calls eliminated from core business logic

---

## Remix Routing Patterns

### File-based Routing (Custom config in vite.config.ts)
Routes are defined in `vite.config.ts` with custom mappings:

```typescript
// URL: /
route("/", "routes/_index/route.tsx")

// URL: /app, /app/dashboard
route("app", "routes/app/route.tsx", () => {
  route("", "routes/app._index/route.tsx")    // /app
  route(":page", "routes/app/$page.tsx")      // /app/dashboard
})

// URL: /apps/nds-rentalrates-app/quote
route("apps/nds-rentalrates-app/:proxy", 
      "routes/apps.nds-rentalrates-app.$proxy.tsx")

// URL: /webhooks/orders/paid
route("webhooks/:topic/:subtopic", 
      "routes/webhooks/$topic/$subtopic.tsx")
```

### Route Organization
- Flat files: `app.search-products.tsx`
- Folders with route.tsx: `app._index/route.tsx`
- Tests colocated: `app.$page.test.ts`

### Authentication Pattern
```typescript
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  // For storefront/app proxy: authenticate.public
  // ...
};
```

---

## Testing Patterns

### Test Structure (Vitest)
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { TestFactories } from "~/shared/testing/factories";

describe("SomeUseCase", () => {
  let mockRepo: MockRepository;
  let useCase: SomeUseCase;

  beforeEach(() => {
    mockRepo = new MockRepository();
    useCase = new SomeUseCase(mockRepo);
  });

  it("should do something", async () => {
    // Arrange
    const entity = TestFactories.createRentalItem({ id: "1" });
    await mockRepo.save(entity);

    // Act
    const result = await useCase.execute({ id: "1" });

    // Assert
    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ /* ... */ });
  });
});
```

### Test Factories
Use `TestFactories` from `~/shared/testing/factories` for creating test data:
- `TestFactories.createRentalItem(overrides)`
- `TestFactories.createBooking(overrides)`
- `TestFactories.createConfirmedBooking(overrides)`

### Mock Repositories
Available in `~/shared/testing/mocks/`:
- `MockBookingRepository`
- `MockRentalItemRepository`

---

## Shopify Integration

### App Type
- **Embedded admin app** with app proxy for storefront
- Distribution: Public (App Store ready)
- Scopes: `read_products,write_products,read_orders,write_orders`

### Authentication
```typescript
// Admin routes
const { admin, session } = await authenticate.admin(request);

// Storefront (app proxy)
const { shop } = await authenticate.public.appProxy(request);
```

### Webhooks
Configured in `shopify.server.ts`:
- `ORDERS_PAID` → Auto-confirm bookings
- `APP_UNINSTALLED` → Cleanup shop data
- `CUSTOMERS_DATA_REQUEST`, `CUSTOMERS_REDACT`, `SHOP_REDACT` → GDPR

Note: `ORDERS_PAID` may be blocked until "protected customer data" approval.

### Extensions
- **price-input**: Admin UI for configuring rental rates
- **cart-multiplier-function**: Shopify Function for cart transforms

---

## Key Files and Concepts

### Core Infrastructure
- `app/shared/container.ts` - DI container factory (creates use cases)
- `app/shared/kernel/Result.ts` - Error handling monad
- `app/shared/kernel/Money.ts` - Value object for currency
- `app/shopify.server.ts` - Shopify API configuration and webhook setup

### Domain Layers
- `app/domains/*/domain/entities/` - Business entities with methods
- `app/domains/*/application/useCases/` - Use case orchestration
- `app/domains/*/infrastructure/repositories/` - Data persistence
- `app/domains/*/presentation/` - DTOs (interfaces only)

### Testing
- `app/shared/testing/factories.ts` - Test data builders
- `app/shared/testing/mocks/` - Repository mocks
- `vitest.config.ts` - Test configuration

### Configuration
- `vite.config.ts` - Remix routing and build config
- `prisma/schema.prisma` - Database schema
- `shopify.app.*.toml` - Shopify CLI configuration

---

## Important Conventions

### Money Handling
Always use `Money` value object for currency:
```typescript
const priceResult = Money.fromCents(1000, "USD");
if (priceResult.isFailure) return Result.fail(priceResult.error);
const price = priceResult.value;
```

### Date Handling
- Store as Date objects in memory
- Prisma auto-converts to/from ISO strings
- Use `new Date()` for timestamps, not string parsing

### Result Pattern
All use cases return `Result<T>`:
```typescript
const result = await useCase.execute(input);
if (result.isFailure) {
  return json({ error: result.error }, { status: 400 });
}
const data = result.value; // Only access after success check
```

### Entity Creation
Use static factory methods:
```typescript
const itemResult = RentalItem.create({ /* props */ });
if (itemResult.isFailure) return Result.fail(itemResult.error);
const item = itemResult.value;
```

### TypeScript Path Alias
Use `~/` for app imports:
```typescript
import { createContainer } from "~/shared/container";
import { RentalItem } from "~/domains/rental/domain/entities/RentalItem";
```

---

## Production Deployment

### Environment Variables (Railway)
Required:
- `SHOPIFY_APP_URL` - Public app URL (must match Railway domain)
- `SHOPIFY_API_KEY` - From Shopify Partners dashboard
- `SHOPIFY_API_SECRET` - From Shopify Partners dashboard  
- `SCOPES` - OAuth scopes (comma-separated)
- `DATABASE_URL` - Postgres connection string (Railway provides)

Optional:
- `SHOP_CUSTOM_DOMAIN` - Custom shop domain if used

### Health Check
`/health` endpoint checks database connectivity:
```bash
curl https://your-app.up.railway.app/health
```
Returns 200 (healthy) or 503 (unhealthy)

### App Proxy Security
All app proxy requests are HMAC-validated (except `/ping`).
Signature validation is in `app/utils/appProxyAuth.ts`.

---

## Documentation

See `docs/` directory for:
- `setup-guide.md` - Initial setup instructions
- `PRODUCTION_CHECKLIST.md` - Pre-launch checklist
- `app-store-listing.md` - App Store submission guide
- `troubleshooting/` - Common issues and solutions

---

## Need More Context?

For deep architectural history and migration decisions, see:
- `.copilot/session-state/` - Session checkpoints with detailed context
- `PRODUCTION_CHANGES.md` - Production hardening changes
- `README.md` - Quick start and deployment overview
