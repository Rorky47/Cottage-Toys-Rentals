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
          Track a product
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Add a product to your Home list, then enable rentals and configure pricing/availability.
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
                Track
              </Button>
            </InlineStack>
          </BlockStack>
        </fetcher.Form>
      </BlockStack>
    </Card>
  );
}

