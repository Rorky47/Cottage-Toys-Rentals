import { useState, useCallback, useMemo } from "react";
import { Autocomplete, Icon, BlockStack, Card, Text } from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import type { RentalFetcher } from "~/features/appPages/types";

type Props = {
  fetcher: RentalFetcher;
  isSubmitting: boolean;
  onPickProduct: () => void;
};

type ProductOption = {
  value: string;
  label: string;
};

export function TrackProductCard({ fetcher, isSubmitting }: Props) {
  const [searchValue, setSearchValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search function
  const searchProducts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      // Call our search endpoint
      const response = await fetch(`/app/search-products?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.products) {
        setProducts(
          data.products.map((p: any) => ({
            value: p.id,
            label: p.title,
          }))
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateText = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (value.length >= 2) {
        // Debounce search
        const timeoutId = setTimeout(() => searchProducts(value), 300);
        return () => clearTimeout(timeoutId);
      } else {
        setProducts([]);
      }
    },
    [searchProducts]
  );

  const updateSelection = useCallback(
    (selected: string[]) => {
      const selectedValue = selected[0];
      if (selectedValue) {
        // Extract product ID and submit
        const productId = selectedValue.replace("gid://shopify/Product/", "");
        fetcher.submit({ intent: "track_product", productId }, { method: "post" });
        
        // Reset
        setSearchValue("");
        setSelectedOptions([]);
        setProducts([]);
      }
    },
    [fetcher]
  );

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      label=""
      value={searchValue}
      prefix={<Icon source={SearchIcon} />}
      placeholder="Search products..."
      autoComplete="off"
      disabled={isSubmitting}
    />
  );

  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingMd">
          Add rental product
        </Text>
        <Text as="p" variant="bodySm" tone="subdued">
          Search for a product to enable rentals. Default pricing will be set automatically from Shopify.
        </Text>

        <Autocomplete
          options={products}
          selected={selectedOptions}
          onSelect={updateSelection}
          textField={textField}
          loading={loading}
          emptyState={
            searchValue.length >= 2 && !loading && products.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <Text as="p" variant="bodySm" tone="subdued">
                  No products found
                </Text>
              </div>
            ) : null
          }
        />
      </BlockStack>
    </Card>
  );
}

