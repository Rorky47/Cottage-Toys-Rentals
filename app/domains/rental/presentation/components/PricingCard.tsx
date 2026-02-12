import { useState } from "react";
import { BlockStack, Button, Card, InlineStack, Text, TextField, Box } from "@shopify/polaris";
import type { RentalConfigRow, RentalFetcher } from "~/domains/rental/presentation/types";

type Props = {
  fetcher: RentalFetcher;
  row: RentalConfigRow;
};

export function PricingCard({ fetcher, row }: Props) {
  const rental = row.rentalItem!;
  const [minDays, setMinDays] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center" wrap>
          <Text as="h3" variant="headingSm">
            Pricing algorithm
          </Text>
          <InlineStack gap="200" blockAlign="center" wrap>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="set_pricing_mode" />
              <input type="hidden" name="rentalItemId" value={rental.id} />
              <input type="hidden" name="mode" value="flat" />
              <Button submit pressed={rental.pricingAlgorithm === "FLAT"}>
                Flat
              </Button>
            </fetcher.Form>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="set_pricing_mode" />
              <input type="hidden" name="rentalItemId" value={rental.id} />
              <input type="hidden" name="mode" value="tiered" />
              <Button submit pressed={rental.pricingAlgorithm === "TIERED"}>
                Tiered
              </Button>
            </fetcher.Form>
          </InlineStack>
        </InlineStack>

        {rental.pricingAlgorithm === "TIERED" ? (
          <>
            <Text as="p" variant="bodySm" tone="subdued">
              Tiers override the per-day price when the rental length is at least the tier's min days. If you have no tiers
              yet, pricing stays at the base per-day price.
            </Text>

            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="add_tier" />
              <input type="hidden" name="rentalItemId" value={rental.id} />
              <InlineStack gap="300" blockAlign="end" wrap>
                <Box minWidth="160px">
                  <TextField
                    label="Min days"
                    name="minDays"
                    type="number"
                    step={1}
                    min={1}
                    value={minDays}
                    onChange={setMinDays}
                    autoComplete="off"
                  />
                </Box>
                <Box minWidth="220px">
                  <TextField
                    label={`Price per day (${row.currencyCode})`}
                    name="pricePerDay"
                    type="number"
                    step={0.01}
                    min={0}
                    value={pricePerDay}
                    onChange={setPricePerDay}
                    autoComplete="off"
                  />
                </Box>
                <Button submit>Save tier</Button>
              </InlineStack>
            </fetcher.Form>

            {rental.rateTiers?.length ? (
              <BlockStack gap="200">
                {rental.rateTiers.map((t) => (
                  <InlineStack key={t.id} align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd">
                      {t.minDays}+ days → {(t.pricePerDayCents / 100).toFixed(2)} {row.currencyCode}/day
                    </Text>
                    <fetcher.Form method="post">
                      <input type="hidden" name="intent" value="remove_tier" />
                      <input type="hidden" name="tierId" value={t.id} />
                      <Button tone="critical" submit size="slim">
                        Remove
                      </Button>
                    </fetcher.Form>
                  </InlineStack>
                ))}
              </BlockStack>
            ) : (
              <Text as="p" variant="bodySm" tone="subdued">
                No tiers yet. Add one like "7 days → 40.00/day".
              </Text>
            )}
          </>
        ) : (
          <Text as="p" variant="bodySm" tone="subdued">
            Flat pricing uses the base per-day price for all rental lengths.
            {rental.rateTiers?.length ? ` (${rental.rateTiers.length} tier${rental.rateTiers.length === 1 ? '' : 's'} saved - switch to Tiered to edit)` : ''}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}
