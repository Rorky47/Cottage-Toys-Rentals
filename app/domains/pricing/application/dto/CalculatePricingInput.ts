import { z } from "zod";

export const CalculatePricingInputSchema = z.object({
  rentalItemId: z.string().min(1),
  durationDays: z.number().int().min(1),
});

export type CalculatePricingInput = z.infer<typeof CalculatePricingInputSchema>;
