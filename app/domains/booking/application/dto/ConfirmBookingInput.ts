import { z } from "zod";

export const ConfirmBookingInputSchema = z.object({
  cartToken: z.string().min(1),
  orderId: z.string().min(1),
});

export type ConfirmBookingInput = z.infer<typeof ConfirmBookingInputSchema>;
