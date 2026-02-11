import { BlockStack, Card, Text, TextField } from "@shopify/polaris";
import type { RentalFetcher } from "~/features/appPages/types";

type Props = {
  fetcher: RentalFetcher;
  isSubmitting: boolean;
  onPickProduct: () => void;
};

export function TrackProductCard({ isSubmitting, onPickProduct }: Props) {
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Add rental product
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Search for a product to enable rentals. Default pricing will be set automatically from Shopify.
        </Text>

        <div onClick={onPickProduct} style={{ cursor: "pointer" }}>
          <TextField
            label=""
            value=""
            onChange={() => {}}
            placeholder="Search products..."
            autoComplete="off"
            disabled={isSubmitting}
            prefix={<span style={{ fontSize: "16px" }}>🔍</span>}
            readOnly
          />
        </div>
      </BlockStack>
    </Card>
  );
}

