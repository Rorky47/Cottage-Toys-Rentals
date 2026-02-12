import { useLoaderData, useFetcher } from "@remix-run/react";
import { BlockStack, Button, Card, Page, Text } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import type { action, WebhooksLoaderData } from "~/features/appPages/webhooks.server";

export default function WebhooksDebugPage() {
  const { rows, ordersPaid } = useLoaderData<WebhooksLoaderData>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  const last = fetcher.data as any;
  if (last?.ok && last.ok !== false) {
    // avoid infinite toasts on rerender
    last.ok = false;
    shopify.toast.show("Webhooks registered successfully!");
  } else if (last?.error) {
    const err = String(last.error);
    last.error = null;
    shopify.toast.show(err, { isError: true, duration: 10000 });
  }

  return (
    <Page>
      <TitleBar title="Webhooks" />
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Status
            </Text>
            <Text as="p" variant="bodySm" tone={ordersPaid ? "success" : "critical"}>
              ORDERS_PAID: {ordersPaid ? "Registered" : "Not registered"}
            </Text>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="register" />
              <Button submit loading={fetcher.state !== "idle"}>
                Register webhooks now
              </Button>
            </fetcher.Form>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Subscriptions
            </Text>
            {rows.length ? (
              rows.map((r) => (
                <Text key={r.id} as="p" variant="bodySm">
                  {r.topic} → {r.callbackUrl ?? r.endpointType}
                </Text>
              ))
            ) : (
              <Text as="p" variant="bodySm" tone="subdued">
                No webhook subscriptions found.
              </Text>
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

