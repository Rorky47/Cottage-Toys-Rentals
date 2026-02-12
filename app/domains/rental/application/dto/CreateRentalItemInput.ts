import { z } from "zod";

export const CreateRentalItemInputSchema = z.object({
  shop: z.string().min(1),
  shopifyProductId: z.string().min(1),
  name: z.string().nullable(),
  imageUrl: z.string().url().nullable().optional(),
  currencyCode: z.string().length(3).default("USD"),
  basePricePerDayCents: z.number().int().min(0),
  pricingAlgorithm: z.enum(["FLAT", "TIERED"]),
  quantity: z.number().int().min(0),
  rateTiers: z
    .array(
      z.object({
        minDays: z.number().int().min(1),
        pricePerDayCents: z.number().int().min(0),
      })
    )
    .optional(),
});

export type CreateRentalItemInput = z.infer<typeof CreateRentalItemInputSchema>;
