import { useMemo } from "react";
import { Form } from "@remix-run/react";
import { BlockStack, Button, Modal, Text } from "@shopify/polaris";
import type { BookingRow } from "~/domains/booking/presentation/calendar/utils/types";
import { dateOnlyToUtcMs } from "~/domains/booking/presentation/calendar/utils/date";
import { bookingMethodLabel, bookingTheme } from "~/domains/booking/presentation/calendar/utils/styles";
import { orderGidToAdminUrl } from "~/utils";

export function MoreRentalsModal(props: {
  open: boolean;
  onClose: () => void;
  date: string | null;
  rows: BookingRow[];
  actionError?: string | null;
}) {
  const { open, onClose, date, rows, actionError } = props;

  const moreRows = useMemo(() => {
    if (!date) return [];
    const dayMs = dateOnlyToUtcMs(date);
    if (!Number.isFinite(dayMs)) return [];
    return rows.filter((r) => {
      const s = dateOnlyToUtcMs(r.startDate);
      const e = dateOnlyToUtcMs(r.endDate);
      return Number.isFinite(s) && Number.isFinite(e) && s <= dayMs && dayMs < e;
    });
  }, [date, rows]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={date ? `Rentals on ${date}` : "Rentals"}
      primaryAction={{
        content: "Close",
        onAction: onClose,
      }}
    >
      <Modal.Section>
        <BlockStack gap="200">
          {actionError ? (
            <Text as="p" variant="bodySm" tone="critical">
              {actionError}
            </Text>
          ) : null}

          {moreRows.length ? (
            moreRows.map((r) => {
              const method = bookingMethodLabel(r.status, r.fulfillmentMethod);
              const bg = bookingTheme(r.status, r.fulfillmentMethod).background;
              const orderUrl = orderGidToAdminUrl(r.orderId);

              return (
                <div
                  key={r.id}
                  style={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 10,
                    padding: 10,
                    background: bg,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>
                    {r.rentalItemName ?? "Rental"} · Qty {r.units}
                    {method ? (
                      <span style={{ marginLeft: 8, fontWeight: 700, fontSize: 12, opacity: 0.8 }}>{method}</span>
                    ) : null}
                  </div>

                  <div style={{ color: "#374151", fontSize: 12 }}>
                    {r.startDate} → {r.endDate} ({r.status})
                  </div>

                  <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <Form method="post">
                      <input type="hidden" name="intent" value="update_booking" />
                      <input type="hidden" name="bookingId" value={r.id} />
                      <input type="hidden" name="status" value={r.status === "RESERVED" ? "CONFIRMED" : r.status} />
                      <select
                        name="fulfillmentMethod"
                        defaultValue={r.fulfillmentMethod ?? "UNKNOWN"}
                        style={{
                          height: 32,
                          borderRadius: 8,
                          border: "1px solid #D1D5DB",
                          padding: "0 10px",
                          background: "#FFFFFF",
                        }}
                      >
                        <option value="UNKNOWN">Unknown</option>
                        <option value="SHIP">Shipping</option>
                        <option value="PICKUP">Pickup</option>
                      </select>
                      <span style={{ marginLeft: 8 }}>
                        <Button submit size="micro">
                          {r.status === "RESERVED" ? "Mark confirmed" : r.status === "CONFIRMED" ? "Save" : "Save"}
                        </Button>
                      </span>
                    </Form>
                    {r.status === "CONFIRMED" ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="update_booking" />
                        <input type="hidden" name="bookingId" value={r.id} />
                        <input type="hidden" name="status" value="RETURNED" />
                        <input type="hidden" name="fulfillmentMethod" value={r.fulfillmentMethod ?? "UNKNOWN"} />
                        <Button submit size="micro" variant="secondary">
                          Mark as returned
                        </Button>
                      </Form>
                    ) : null}
                  </div>

                  {orderUrl ? (
                    <div style={{ marginTop: 6 }}>
                      <Button url={orderUrl} target="_blank">
                        View order
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <Text as="p" variant="bodySm" tone="subdued">
              No rentals.
            </Text>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

