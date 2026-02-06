import { Badge, BlockStack, Box, Button, InlineStack, Text } from "@shopify/polaris";
import type { RentalConfigRow, RentalFetcher } from "~/features/appPages/types";
import { RentalBaseAndAvailabilityForm } from "~/features/appPages/components/RentalBaseAndAvailabilityForm";
import { PricingCard } from "~/features/appPages/components/PricingCard";

type Props = {
  row: RentalConfigRow;
  fetcher: RentalFetcher;
};

export function ProductCard({ row, fetcher }: Props) {
  return (
    <Box
      key={row.refId ?? `rental:${row.shopifyProductId}`}
      padding="400"
      borderWidth="025"
      borderColor="border"
      borderRadius="200"
    >
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center" wrap>
          <BlockStack gap="100">
            <Text as="p" variant="bodyMd" fontWeight="semibold">
              {row.productTitle ?? `Product ${row.shopifyProductId}`}
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Product ID {row.shopifyProductId}
            </Text>
          </BlockStack>
          <InlineStack gap="200">
            <Badge tone={row.tracked ? "success" : "attention"}>{row.tracked ? "Tracked" : "Untracked"}</Badge>
            <Badge tone={row.rentalItem ? "success" : "attention"}>
              {row.rentalItem ? "Rentals enabled" : "Rentals not enabled"}
            </Badge>
            <Button url={`shopify:admin/products/${row.shopifyProductId}`} target="_blank">
              View product
            </Button>
            {row.tracked && row.refId ? (
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="untrack_product" />
                <input type="hidden" name="refId" value={row.refId} />
                <Button tone="critical" submit>
                  Untrack
                </Button>
              </fetcher.Form>
            ) : null}
            {!row.tracked ? (
              <fetcher.Form method="post">
                <input type="hidden" name="intent" value="track_existing_rental" />
                <input type="hidden" name="productId" value={row.shopifyProductId} />
                <Button submit>Track</Button>
              </fetcher.Form>
            ) : null}
          </InlineStack>
        </InlineStack>

        {!row.rentalItem ? (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="enable_rentals" />
            <input type="hidden" name="productId" value={row.shopifyProductId} />
            <InlineStack gap="300" blockAlign="center" wrap>
              <Text as="p" variant="bodySm" tone="subdued">
                Creates a rental configuration using default variant price and Shopify inventory.
              </Text>
              <Button submit variant="primary">
                Enable rentals
              </Button>
            </InlineStack>
          </fetcher.Form>
        ) : (
          <>
            <RentalBaseAndAvailabilityForm fetcher={fetcher} row={row} />
            <PricingCard fetcher={fetcher} row={row} />
          </>
        )}
      </BlockStack>
    </Box>
  );
}

