import { z } from "zod";

export const UpdateRentalItemInputSchema = z.object({
  rentalItemId: z.string().min(1),
  basePricePerDayCents: z.number().int().min(0).optional(),
  pricingAlgorithm: z.enum(["FLAT", "TIERED"]).optional(),
  quantity: z.number().int().min(0).optional(),
  rateTiers: z
    .array(
      z.object({
        minDays: z.number().int().min(1),
        pricePerDayCents: z.number().int().min(0),
      })
    )
    .optional(),
});

export type UpdateRentalItemInput = z.infer<typeof UpdateRentalItemInputSchema>;
