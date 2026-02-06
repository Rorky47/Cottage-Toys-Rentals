import { useEffect, useMemo, useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { BlockStack, Page } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import type { RentalConfigRow } from "~/features/appPages/types";
import { TrackProductCard } from "~/features/appPages/components/TrackProductCard";
import { ProductList } from "~/features/appPages/components/ProductList";
import type { HomeLoaderData } from "~/features/appPages/home.server";
import type { action } from "~/features/appPages/home.server";

export default function RentalsHome() {
  const { rows } = useLoaderData<HomeLoaderData>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [productId, setProductId] = useState("");

  const isSubmitting = fetcher.state !== "idle";
  const last = fetcher.data as any;

  useEffect(() => {
    if (!last) return;
    if (last.ok) {
      shopify.toast.show("Saved");
      setProductId("");
      if (last.warning) {
        shopify.toast.show(String(last.warning), { isError: true });
      }
    } else if (last.error) {
      shopify.toast.show(last.error, { isError: true });
    }
  }, [last, shopify]);

  const displayRows = useMemo(() => rows as unknown as RentalConfigRow[], [rows]);

  async function pickProduct() {
    try {
      const picked = await shopify.resourcePicker({ type: "product", multiple: false, action: "select" });
      const first = picked && (picked[0] || (picked as any).selection?.[0]);
      const gid = first && first.id ? String(first.id) : "";
      const m = /gid:\/\/shopify\/Product\/(\d+)/.exec(gid);
      const id = m?.[1];
      if (!id) return;
      fetcher.submit({ intent: "track_product", productId: id }, { method: "post" });
    } catch (e: any) {
      shopify.toast.show(String(e?.message ?? e), { isError: true });
    }
  }

  return (
    <Page>
      <TitleBar title="Home" />

      <BlockStack gap="500">
        <TrackProductCard
          fetcher={fetcher}
          productId={productId}
          onProductIdChange={setProductId}
          isSubmitting={isSubmitting}
          onPickProduct={pickProduct}
        />

        <ProductList rows={displayRows} fetcher={fetcher} />
      </BlockStack>
    </Page>
  );
}

