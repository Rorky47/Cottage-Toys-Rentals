import { BlockStack, Box, Button, Card, InlineStack, Text, TextField } from "@shopify/polaris";
import type { RentalFetcher } from "~/features/appPages/types";

type Props = {
  fetcher: RentalFetcher;
  productId: string;
  onProductIdChange: (value: string) => void;
  isSubmitting: boolean;
  onPickProduct: () => void;
};

export function TrackProductCard({ fetcher, productId, onProductIdChange, isSubmitting, onPickProduct }: Props) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Add rental product
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Search for a product or enter its ID below. Rentals will be enabled automatically with default pricing from Shopify.
        </Text>

        <InlineStack gap="300" blockAlign="center" wrap>
          <Button onClick={onPickProduct}>Search products</Button>
        </InlineStack>

        <fetcher.Form method="post">
          <BlockStack gap="300">
            <input type="hidden" name="intent" value="track_product" />
            <InlineStack gap="300" blockAlign="end" wrap={false}>
              <Box minWidth="280px">
                <TextField
                  label="Shopify product ID"
                  value={productId}
                  onChange={onProductIdChange}
                  name="productId"
                  autoComplete="off"
                  helpText="Example: 1234567890 (or gid://shopify/Product/1234567890)"
                />
              </Box>
              <Button variant="primary" submit loading={isSubmitting}>
                Add product
              </Button>
            </InlineStack>
          </BlockStack>
        </fetcher.Form>
      </BlockStack>
    </Card>
  );
}

