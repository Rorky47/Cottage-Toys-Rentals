import { Badge, BlockStack, Box, Button, InlineStack, Text } from "@shopify/polaris";
import type { RentalConfigRow, RentalFetcher } from "~/domains/rental/presentation/types";
import { RentalBaseAndAvailabilityForm } from "~/domains/rental/presentation/components/RentalBaseAndAvailabilityForm";
import { PricingCard } from "~/domains/rental/presentation/components/PricingCard";

type Props = {
  row: RentalConfigRow;
  fetcher: RentalFetcher;
};

export function ProductCard({ row, fetcher }: Props) {
  return (
    <Box
      key={row.shopifyProductId}
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
          <InlineStack gap="200" blockAlign="center">
            {row.rentalItem && (
              <Badge tone="success">Rentals enabled</Badge>
            )}
            <Button url={`shopify:admin/products/${row.shopifyProductId}`} target="_blank" size="slim">
              View in Shopify
            </Button>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="remove_product" />
              <input type="hidden" name="productId" value={row.shopifyProductId} />
              <Button tone="critical" submit size="slim">
                Remove
              </Button>
            </fetcher.Form>
          </InlineStack>
        </InlineStack>

        {row.rentalItem ? (
          <>
            <RentalBaseAndAvailabilityForm fetcher={fetcher} row={row} />
            <PricingCard fetcher={fetcher} row={row} />
          </>
        ) : (
          <Text as="p" variant="bodySm" tone="subdued">
            Loading rental configuration...
          </Text>
        )}
      </BlockStack>
    </Box>
  );
}

