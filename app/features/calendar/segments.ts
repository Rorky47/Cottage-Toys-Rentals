import type { BookingRow, Segment } from "~/features/calendar/types";
import { DAY_MS, dateOnlyToUtcMs } from "~/features/calendar/date";
import { bookingMethodLabel } from "~/features/calendar/styles";
import { orderGidToAdminUrl } from "~/utils";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function buildSegmentsForWeek(weekStartMs: number, rows: BookingRow[]): Segment[] {
  const weekEndMs = weekStartMs + 7 * DAY_MS;
  const rawSegments: Array<Omit<Segment, "lane">> = [];

  for (const b of rows) {
    const bStart = dateOnlyToUtcMs(b.startDate);
    // Treat end date as inclusive for calendar rendering.
    const bEnd = dateOnlyToUtcMs(b.endDate) + DAY_MS;
    if (!(Number.isFinite(bStart) && Number.isFinite(bEnd))) continue;

    const segStart = Math.max(bStart, weekStartMs);
    const segEnd = Math.min(bEnd, weekEndMs);
    if (!(segStart < segEnd)) continue;

    const colStart = clamp(Math.round((segStart - weekStartMs) / DAY_MS), 0, 6);
    const colSpan = clamp(Math.round((segEnd - segStart) / DAY_MS), 1, 7);

    const name = b.rentalItemName ?? "Rental";
    const label = `${name} · Qty ${b.units}`;
    const method = bookingMethodLabel(b.status, b.fulfillmentMethod);
    const title = `${name}\n${b.startDate} → ${b.endDate}\nQty ${b.units}\n${b.status}${method ? `\n${method}` : ""}`;
    const orderUrl = orderGidToAdminUrl(b.orderId);

    rawSegments.push({
      id: `${b.id}:${weekStartMs}`,
      bookingId: b.id,
      colStart,
      colSpan,
      status: b.status,
      fulfillmentMethod: b.fulfillmentMethod,
      label,
      title,
      orderUrl,
    });
  }

  // Earlier starts first; longer segments first when same start.
  rawSegments.sort((a, b) => (a.colStart - b.colStart) || (b.colSpan - a.colSpan));

  // Simple lane packing: keep last end per lane.
  const laneEnd: number[] = [];
  const packed: Segment[] = [];
  for (const seg of rawSegments) {
    const segEndCol = seg.colStart + seg.colSpan;
    let lane = 0;
    while (lane < laneEnd.length) {
      if (seg.colStart >= laneEnd[lane]) break;
      lane++;
    }
    if (lane === laneEnd.length) laneEnd.push(segEndCol);
    else laneEnd[lane] = segEndCol;

    packed.push({ ...seg, lane });
  }

  return packed;
}

