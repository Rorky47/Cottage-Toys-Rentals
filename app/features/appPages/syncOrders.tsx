import { useFetcher } from "@remix-run/react";
import { BlockStack, Button, Card, Page, Text, Banner } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import type { action } from "~/features/appPages/syncOrders.server";

export default function SyncOrdersPage() {
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const last = fetcher.data as any;
  if (last?.ok && last.ok !== false) {
    last.ok = false;
    const msg = `Synced ${last.confirmed} booking(s), skipped ${last.skipped} already confirmed`;
    shopify.toast.show(msg);
  } else if (last?.error) {
    const err = String(last.error);
    last.error = null;
    shopify.toast.show(err, { isError: true, duration: 10000 });
  }

  const isLoading = fetcher.state !== "idle";

  return (
    <Page>
      <TitleBar title="Sync Orders" />
      <BlockStack gap="500">
        <Banner tone="info">
          <p>
            Click the button below to sync paid orders from Shopify and confirm any RESERVED bookings.
            This is needed until the ORDERS_PAID webhook receives Protected Customer Data approval.
          </p>
        </Banner>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Manual Order Sync
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              This will check the last 50 paid orders and promote any RESERVED bookings to CONFIRMED status.
            </Text>
            <fetcher.Form method="post">
              <Button submit loading={isLoading} variant="primary">
                {isLoading ? "Syncing..." : "Sync Orders Now"}
              </Button>
            </fetcher.Form>
          </BlockStack>
        </Card>

        {last && !last.error && (
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Last Sync Result
              </Text>
              <Text as="p" variant="bodyMd">
                Orders checked: {last.total}
              </Text>
              <Text as="p" variant="bodyMd">
                Bookings confirmed: {last.confirmed}
              </Text>
              <Text as="p" variant="bodyMd">
                Already confirmed (skipped): {last.skipped}
              </Text>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}
