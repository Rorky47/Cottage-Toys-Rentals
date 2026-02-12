import { useMemo, useState } from "react";
import { useActionData, useLoaderData } from "@remix-run/react";
import { BlockStack, Box, Card, Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  buildMonthWeeks,
  toDateOnly,
  DAY_MS,
  WEEKDAY_LABELS,
  MIN_VISIBLE_LANES,
  DAY_HEADER_HEIGHT_PX,
  LANE_HEIGHT_PX,
  type BookingRow,
  buildSegmentsForWeek,
  getMaxLaneCount,
  CalendarMonthNav,
  CalendarWeekRow,
  MoreRentalsModal,
} from "~/domains/booking/presentation/calendar/utils";
import type { CalendarActionData, CalendarLoaderData } from "~/domains/booking/presentation/calendar/calendar.server";

export default function CalendarPage() {
  const { year, month, rows, todayDate } = useLoaderData<CalendarLoaderData>();
  const actionData = useActionData<CalendarActionData>();

  const [moreOpen, setMoreOpen] = useState(false);
  const [moreDate, setMoreDate] = useState<string | null>(null);

  const todayUtcMs = useMemo(() => Date.parse(`${todayDate}T00:00:00.000Z`), [todayDate]);

  const dayCountsLabel = useMemo(() => {
    const goingOut = rows.filter((r) => r.startDate === todayDate).length;
    const comingBack = rows.filter((r) => r.endDate === todayDate).length;
    return `Going out: ${goingOut} · Coming back: ${comingBack}`;
  }, [rows, todayDate]);

  const prevMonthUrl = useMemo(() => {
    let y = year;
    let m = month - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    return `?year=${y}&month=${m + 1}`;
  }, [year, month]);

  const nextMonthUrl = useMemo(() => {
    let y = year;
    let m = month + 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    return `?year=${y}&month=${m + 1}`;
  }, [year, month]);

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(year, month, 1));
    return d.toLocaleString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  }, [year, month]);

  const { weeks, calendarStartMs } = useMemo(() => buildMonthWeeks({ year, month }), [year, month]);
  const weekCount = weeks.length;

  const segmentsByWeek = useMemo(() => {
    return weeks.map((_, w) => buildSegmentsForWeek(calendarStartMs + w * 7 * DAY_MS, rows));
  }, [calendarStartMs, rows, weeks]);

  // Calculate actual lane count needed for each week (min 3 for consistent sizing)
  const laneCountByWeek = useMemo(() => {
    return segmentsByWeek.map(segments => Math.max(MIN_VISIBLE_LANES, getMaxLaneCount(segments)));
  }, [segmentsByWeek]);

  return (
    <Page>
      <TitleBar title="Rental calendar" />

      <BlockStack gap="500">
        <Card>
          <BlockStack gap="300">
            <CalendarMonthNav
              monthLabel={monthLabel}
              prevMonthUrl={prevMonthUrl}
              nextMonthUrl={nextMonthUrl}
              countsLabel={dayCountsLabel}
            />

            <Box padding="300" borderWidth="025" borderColor="border" borderRadius="200">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0 }}>
                {WEEKDAY_LABELS.map((d) => (
                  <div
                    key={d}
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      textAlign: "center",
                      padding: "6px 0",
                    }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 8,
                  border: "1px solid #E5E7EB",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#FFFFFF",
                }}
              >
                {weeks.map((week, w) => (
                  <CalendarWeekRow
                    key={`week-${w}`}
                    week={week}
                    weekIndex={w}
                    weekCount={weekCount}
                    segments={segmentsByWeek[w] ?? []}
                    visibleLaneCount={laneCountByWeek[w] ?? MIN_VISIBLE_LANES}
                    dayHeaderHeightPx={DAY_HEADER_HEIGHT_PX}
                    laneHeightPx={LANE_HEIGHT_PX}
                    onMoreClick={(date) => {
                      setMoreDate(date);
                      setMoreOpen(true);
                    }}
                    todayDate={todayDate}
                    todayUtcMs={todayUtcMs}
                  />
                ))}
              </div>
            </Box>
          </BlockStack>
        </Card>
      </BlockStack>

      <MoreRentalsModal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        date={moreDate}
        rows={rows}
        actionError={actionData && actionData.ok === false ? String(actionData.error) : null}
      />
    </Page>
  );
}

