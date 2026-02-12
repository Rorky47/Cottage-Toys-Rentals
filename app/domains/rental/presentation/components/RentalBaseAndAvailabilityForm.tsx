import { useEffect, useState } from "react";
import { Box, Button, InlineStack, TextField } from "@shopify/polaris";
import type { RentalConfigRow, RentalFetcher } from "~/domains/rental/presentation/types";

export function RentalBaseAndAvailabilityForm({ fetcher, row }: { fetcher: RentalFetcher; row: RentalConfigRow }) {
  const rental = row.rentalItem!;

  const [basePricePerDay, setBasePricePerDay] = useState((rental.basePricePerDayCents / 100).toFixed(2));
  const [quantity, setQuantity] = useState(String(rental.quantity ?? 0));

  useEffect(() => {
    setBasePricePerDay((rental.basePricePerDayCents / 100).toFixed(2));
    setQuantity(String(rental.quantity ?? 0));
  }, [rental.id, rental.basePricePerDayCents, rental.quantity]);

  return (
    <fetcher.Form method="post">
      <input type="hidden" name="intent" value="update_base" />
      <input type="hidden" name="rentalItemId" value={rental.id} />
      <InlineStack gap="300" blockAlign="end" wrap>
        <Box minWidth="220px">
          <TextField
            label={`Base price per day (${row.currencyCode})`}
            name="basePricePerDay"
            type="number"
            step={0.01}
            value={basePricePerDay}
            onChange={setBasePricePerDay}
            helpText={row.defaultVariantPrice ? `Variant price is ${row.defaultVariantPrice}` : undefined}
            autoComplete="off"
          />
        </Box>
        <Box minWidth="160px">
          <TextField
            label="Available quantity"
            name="quantity"
            type="number"
            step={1}
            min={0}
            value={quantity}
            onChange={setQuantity}
            helpText={row.shopInventoryOnHand != null ? `Shopify inventory shows ${row.shopInventoryOnHand}` : undefined}
            autoComplete="off"
          />
        </Box>
        <Button submit>Save</Button>
      </InlineStack>
    </fetcher.Form>
  );
}

