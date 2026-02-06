import { Button, Text } from "@shopify/polaris";

export function CalendarMonthNav(props: {
  monthLabel: string;
  prevMonthUrl: string;
  nextMonthUrl: string;
  countsLabel?: string;
}) {
  const { monthLabel, prevMonthUrl, nextMonthUrl, countsLabel } = props;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Text as="h2" variant="headingMd">
          {monthLabel}
        </Text>
        {countsLabel ? (
          <Text as="p" variant="bodySm" tone="subdued">
            {countsLabel}
          </Text>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button url={prevMonthUrl}>Prev</Button>
        <Button url={nextMonthUrl}>Next</Button>
      </div>
    </div>
  );
}

