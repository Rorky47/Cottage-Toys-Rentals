import { z } from "zod";

export const CreateBookingInputSchema = z.object({
  rentalItemId: z.string().min(1),
  cartToken: z.string().min(1),
  startDate: z.date(),
  endDate: z.date(),
  units: z.number().int().min(1),
  fulfillmentMethod: z.enum(["UNKNOWN", "SHIP", "PICKUP"]),
  ttlMs: z.number().int().positive().optional(),
});

export type CreateBookingInput = z.infer<typeof CreateBookingInputSchema>;
