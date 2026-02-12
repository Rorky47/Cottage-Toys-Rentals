# Cottage Toys Rentals - Copilot Instructions

## Project Overview

**Cottage Toys Rentals** is an embedded Shopify app for managing rental product inventory and availability. The app tracks rental bookings, calculates dynamic pricing based on rental duration, and integrates with Shopify's checkout flow.

### Tech Stack
- **Framework**: Remix (React-based full-stack framework)
- **Architecture**: Clean Architecture with Domain-Driven Design (DDD)
- **Runtime**: Node.js (>=20.19 <22 || >=22.12)
- **Database**: PostgreSQL with Prisma ORM
- **Hosting**: Railway (production)
- **Shopify Integration**: Shopify App Remix, App Bridge React
- **UI**: Shopify Polaris components
- **Testing**: Vitest (with mocks and factories)
- **Build Tool**: Vite
- **Type System**: TypeScript (strict mode)

---

## Architecture: Clean Architecture + DDD

The app follows **Clean Architecture** principles with **Domain-Driven Design** patterns for maintainability and testability.

###Architecture Layers (Dependency Flow)

```
Presentation Layer (Routes/UI)
        ↓
Application Layer (Use Cases)
        ↓
Domain Layer (Entities, Value Objects)
        ↓
Infrastructure Layer (Repositories, Adapters)
```

**Key Principles:**
- Dependencies point inward (outer layers depend on inner layers)
- Domain layer has NO dependencies on frameworks or databases
- Use cases orchestrate business logic
- Repositories abstract data access
- DTOs transfer data between layers

---

## Key Concepts

### Dependency Injection Container

**Location**: `app/shared/container.ts`

The container manages use case instantiation and repository lifecycle.

**Usage Pattern:**

```typescript
import { createContainer } from "~/shared/container";

// In route handlers or services:
const container = createContainer();
const useCase = container.getCheckAvailabilityUseCase();
const result = await useCase.execute(input);
```

### Use Case Pattern

All use cases follow the same pattern:

```typescript
interface SomeInput {
  // Input parameters
}

interface SomeOutput {
  // Output data
}

export class SomeUseCase {
  constructor(private readonly repo: IRepository) {}

  async execute(input: SomeInput): Promise<Result<SomeOutput>> {
    // 1. Validate input
    // 2. Load entities
    // 3. Apply business rules
    // 4. Persist changes
    // 5. Return Result (success or failure)
    
    return Result.ok(output);
    // or
    return Result.fail("Error message");
  }
}
```

**Error Handling:**
- Use `Result<T>` type (Railway-Oriented Programming)
- Check `result.isSuccess` or `result.isFailure`
- Access value via `result.value` or error via `result.error`

---

## Available Use Cases

### Booking Domain
- `getCheckAvailabilityUseCase()` - Check if dates are available
- `getCreateBookingUseCase()` - Create RESERVED booking (storefront)
- `getCreateConfirmedBookingUseCase()` - Create CONFIRMED booking (webhooks)
- `getConfirmBookingByIdUseCase()` - Confirm booking by ID
- `getPromoteBookingByDatesUseCase()` - Promote by date match
- `getCleanupExpiredBookingsUseCase()` - Remove expired reservations

### Rental Domain
- `getCreateRentalItemUseCase()` - Create new rental item
- `getUpsertRentalItemUseCase()` - Create or update rental item
- `getUpdateRentalItemUseCase()` - Update rental configuration
- `getTrackProductUseCase(adminApi)` - Track Shopify product
- `getUpdateRentalBasicsUseCase(adminApi)` - Update price/quantity
- `getDeleteRentalItemUseCase()` - Remove rental configuration

### Pricing Domain
- `getCalculatePricingUseCase()` - Calculate rental price

---

## Domain Entities

### Booking Entity (`app/domains/booking/domain/entities/Booking.ts`)

**Statuses:**
- `RESERVED` - Temporary hold (45min TTL)
- `CONFIRMED` - Paid booking
- `CANCELLED` - Cancelled
- `RETURNED` - Returned

**Key Methods:**
- `createReservation()` - Create RESERVED booking
- `confirm(orderId)` - Promote to CONFIRMED
- `cancel()`, `markAsReturned()`
- `updateUnits()`, `updateFulfillmentMethod()`

### RentalItem Entity (`app/domains/rental/domain/entities/RentalItem.ts`)

**Key Methods:**
- `updateBasics()` - Update name, price, currency
- `updatePricing()` - Change pricing configuration
- `updateQuantity()` - Adjust inventory

---

## Value Objects (Shared Kernel)

### Result<T>
Railway-oriented error handling:
```typescript
const result = Result.ok(value);
const failure = Result.fail("error message");

if (result.isSuccess) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### Money
Type-safe currency:
```typescript
const price = Money.fromCents(2500, "USD"); // $25.00
```

### DateRange
Validates rental periods:
```typescript
const range = DateRange.create(startDate, endDate);
console.log(range.value.durationDays); // Inclusive
```

---

## Code Conventions

### DTOs are Interfaces
```typescript
// ❌ Wrong
const input = new TrackProductInput(shop, productId);

// ✅ Correct
const input: TrackProductInput = { shop, shopifyProductId: productId };
```

### Always Use Container
```typescript
// ❌ Wrong
import { someFunction } from "~/rental/old-file";

// ✅ Correct
const container = createContainer();
const useCase = container.getSomeUseCase();
const result = await useCase.execute(input);
```

### Check Result Pattern
```typescript
const result = await useCase.execute(input);

if (result.isFailure) {
  return json({ error: result.error }, { status: 400 });
}

const data = result.value;
```

---

## Migration Status

### ✅ Migrated to Use Cases
- Proxy routes (quote, reserve, unreserve)
- Admin dashboard
- ordersPaid webhook

### ⚠️ Deprecated Files (Do Not Add Features)
- `app/rental/*.server.ts` - Old architecture
- Use new use cases instead

---

## Common Tasks

### Add New Use Case

1. Create use case in `app/domains/{domain}/application/useCases/`
2. Add to container in `app/shared/container.ts`
3. Use in route via `createContainer()`

### Migrate Old Route

1. Replace Prisma calls with use case execution
2. Update imports to use `createContainer()`
3. Use DTOs as interfaces (not classes)
4. Return `Result<T>` pattern

---

## Troubleshooting

**Build Error: "container is not exported"**
- Use `createContainer()`, not `container`

**Build Error: "SomeDto is not exported"**
- DTOs are interfaces - use object literals, not `new SomeDto()`

**Database Error**
- Run `npm run setup` to regenerate Prisma client

---

## Key Principles

1. **Use containers** - Always `createContainer()` to get use cases
2. **DTOs are interfaces** - Use object literals
3. **Result pattern** - Check `isSuccess`/`isFailure`
4. **Entities > Prisma** - Work with domain entities
5. **Type-safe values** - Use Money, DateRange value objects
