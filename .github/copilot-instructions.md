# Cottage Toys Rentals - Copilot Instructions

**Last Updated**: February 12, 2026  
**Architecture**: Clean Architecture with Domain-Driven Design  
**Migration Status**: ✅ Complete

---

## Quick Reference

### Architecture Pattern
Clean Architecture + DDD implemented across 3 domains:
- **Booking** - Rental reservations
- **Rental** - Product configuration  
- **Pricing** - Price calculations

### Directory Structure
```
app/domains/{booking|rental|pricing}/
  ├── domain/entities/       # Business logic
  ├── application/useCases/  # Orchestration  
  ├── infrastructure/        # Data access
  └── presentation/          # HTTP handlers
```

### Key Principles
1. **DTOs are interfaces** - Never use `new SomeDto(...)`
2. **Container is factory** - Use `createContainer()` not `container`
3. **Result pattern** - Check `isSuccess` before accessing `value`
4. **Thin controllers** - Business logic in entities/use cases
5. **Repository pattern** - Return domain entities, not Prisma types

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

## All Use Cases

### Booking Domain
- `CheckAvailabilityUseCase` - Verify item available
- `CreateBookingUseCase` - New RESERVED booking
- `CreateConfirmedBookingUseCase` - Direct CONFIRMED
- `ConfirmBookingByIdUseCase` - By exact ID
- `PromoteBookingByDatesUseCase` - By date match
- `DeleteReservationUseCase` - Delete RESERVED
- `GetCalendarBookingsUseCase` - Admin calendar
- `UpdateBookingStatusUseCase` - Admin updates
- `CleanupExpiredBookingsUseCase` - Remove expired

### Rental Domain
- `TrackProductUseCase` - Enable rental
- `UpdateRentalBasicsUseCase` - Price/quantity
- `GetRentalItemsForDashboardUseCase` - Admin list
- `UpsertRentalItemUseCase` - Webhook updates
- `DeleteRentalItemUseCase` - Remove rental

### Pricing Domain
- `CalculatePricingUseCase` - Calculate price

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

### ✅ Migrated
- All booking operations
- All rental operations  
- All pricing calculations
- Storefront API (quote, reserve, unreserve)
- Admin dashboard & calendar
- Webhooks (ordersPaid, GDPR, app lifecycle)

### ⚠️ Intentional Exceptions (4 Prisma calls)
- Privacy settings CRUD (simple, no logic)
- ProductReference legacy feature (will remove)

**Total**: 8 Prisma calls eliminated, 4 remain (intentional)

---

## Quick Commands

```bash
npm run dev    # Start dev server
npm run build  # Build (verify no errors)
npm run test   # Run tests (60+ passing)
```

---

## Key Files

- `app/shared/container.ts` - DI container
- `app/shared/kernel/Result.ts` - Error handling
- `app/domains/*/domain/entities/` - Business logic
- `app/domains/*/application/useCases/` - Operations

---

## Need More Details?

See session checkpoints in `.copilot/session-state/` for:
- Complete migration history
- Architectural decisions
- Pattern examples
- Troubleshooting guides
