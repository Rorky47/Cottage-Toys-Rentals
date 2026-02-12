import type { Segment, WeekCell } from "~/features/calendar/types";
import { BookingBar } from "~/features/calendar/components/BookingBar";

export function CalendarWeekRow(props: {
  week: WeekCell[];
  weekIndex: number;
  weekCount: number;
  segments: Segment[];
  visibleLaneCount: number;
  dayHeaderHeightPx: number;
  laneHeightPx: number;
  onMoreClick: (date: string) => void;
  todayDate: string;
  todayUtcMs: number;
}) {
  const {
    week,
    weekIndex,
    weekCount,
    segments,
    visibleLaneCount,
    dayHeaderHeightPx,
    laneHeightPx,
    onMoreClick,
    todayDate,
    todayUtcMs,
  } = props;

  const rowCount = visibleLaneCount + 1; // day header row + dynamic visible lanes
  const gridTemplateRows = `${dayHeaderHeightPx}px repeat(${visibleLaneCount}, ${laneHeightPx}px)`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gridTemplateRows,
        gap: 0,
        background: "#FFFFFF",
      }}
    >
      {week.map((c, colIdx) => (
        (() => {
          const cellUtcMs = Date.parse(`${c.date}T00:00:00.000Z`);
          const isPast = Number.isFinite(cellUtcMs) && cellUtcMs < todayUtcMs;
          const isToday = c.date === todayDate;

          return (
        <div
          key={c.date}
          style={{
            gridColumn: colIdx + 1,
            gridRow: `1 / span ${rowCount}`,
            background: isPast ? "#F9FAFB" : c.inMonth ? "#FFFFFF" : "#F9FAFB",
            borderRight: colIdx < 6 ? "1px solid #E5E7EB" : undefined,
            borderBottom: weekIndex < weekCount - 1 ? "1px solid #E5E7EB" : undefined,
            padding: "6px 8px",
            position: "relative",
            zIndex: 0,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              lineHeight: "16px",
              color: isPast ? "#9CA3AF" : c.inMonth ? "#111827" : "#9CA3AF",
              background: isToday ? "#DCFCE7" : undefined,
              borderRadius: isToday ? 999 : undefined,
              padding: isToday ? "2px 6px" : undefined,
              display: "inline-block",
            }}
          >
            {c.dayNumber}
          </div>
        </div>
          );
        })()
      ))}

      {segments.map((s) => (
        <BookingBar key={s.id} segment={s} laneHeightPx={laneHeightPx} />
      ))}
    </div>
  );
}

