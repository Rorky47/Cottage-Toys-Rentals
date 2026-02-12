import { z } from "zod";

/**
 * Input DTO for checking rental availability.
 */
export const CheckAvailabilityInputSchema = z.object({
  rentalItemId: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  requestedUnits: z.number().int().min(1),
});

export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilityInputSchema>;
