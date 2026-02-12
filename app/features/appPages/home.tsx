import { useEffect, useMemo } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { BlockStack, Page } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import type { RentalConfigRow } from "~/features/appPages/types";
import { TrackProductCard } from "~/features/appPages/components/TrackProductCard";
import { ProductList } from "~/features/appPages/components/ProductList";
import { PrivacyBanner } from "~/features/appPages/components/PrivacyBanner";
import type { HomeLoaderData } from "~/features/appPages/home.server";
import type { action } from "~/features/appPages/home.server";

export default function RentalsHome() {
  const { rows, privacyAccepted } = useLoaderData<HomeLoaderData>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const isSubmitting = fetcher.state !== "idle";
  const last = fetcher.data as any;

  useEffect(() => {
    if (!last) return;
    if (last.ok) {
      shopify.toast.show("Saved");
      if (last.warning) {
        shopify.toast.show(String(last.warning), { isError: true });
      }
    } else if (last.error) {
      shopify.toast.show(last.error, { isError: true });
    }
  }, [last, shopify]);

  const displayRows = useMemo(() => rows as unknown as RentalConfigRow[], [rows]);

  return (
    <Page>
      <TitleBar title="Home" />

      <BlockStack gap="500">
        <PrivacyBanner hasAccepted={privacyAccepted} />
        
        <TrackProductCard
          fetcher={fetcher}
          isSubmitting={isSubmitting}
        />

        <ProductList rows={displayRows} fetcher={fetcher} />
      </BlockStack>
    </Page>
  );
}

