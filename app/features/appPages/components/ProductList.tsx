import { Badge, BlockStack, Box, Card, InlineStack, Text } from "@shopify/polaris";
import type { RentalConfigRow, RentalFetcher } from "~/features/appPages/types";
import { ProductCard } from "~/features/appPages/components/ProductCard";

type Props = {
  rows: RentalConfigRow[];
  fetcher: RentalFetcher;
};

export function ProductList({ rows, fetcher }: Props) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Products
          </Text>
          <Badge tone="info">{String(rows.length)}</Badge>
        </InlineStack>

        {rows.length === 0 ? (
          <Box padding="400" background="bg-surface-secondary" borderRadius="200">
            <Text as="p" variant="bodyMd">
              No rental products yet.
            </Text>
          </Box>
        ) : (
          <BlockStack gap="400">
            {rows.map((row) => (
              <ProductCard key={row.shopifyProductId} row={row} fetcher={fetcher} />
            ))}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

