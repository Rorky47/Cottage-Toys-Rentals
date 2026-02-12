import { bookingBarStyle } from "~/domains/booking/presentation/calendar/utils/styles";
import type { Segment } from "~/domains/booking/presentation/calendar/utils/types";

export function BookingBar(props: { segment: Segment; laneHeightPx: number }) {
  const { segment, laneHeightPx } = props;

  const fontSize = Math.max(9, Math.min(13, Math.round(laneHeightPx * 0.5)));
  const lineHeight = Math.max(12, Math.round(laneHeightPx * 0.6));
  const horizontalPadding = Math.max(6, Math.round(laneHeightPx * 0.35));

  const style = {
    gridColumn: `${segment.colStart + 1} / span ${segment.colSpan}`,
    gridRow: segment.lane + 2,
    height: laneHeightPx - 4,
    display: "flex",
    alignItems: "center",
    padding: `0 ${horizontalPadding}px`,
    margin: "2px 4px",
    borderRadius: 999,
    fontSize,
    lineHeight: `${lineHeight}px`,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    position: "relative" as const,
    zIndex: 1,
    ...bookingBarStyle(segment.status, segment.fulfillmentMethod),
  };

  if (segment.orderUrl) {
    return (
      <a
        href={segment.orderUrl}
        target="_blank"
        rel="noreferrer"
        title={segment.title}
        style={{
          ...style,
          cursor: "pointer",
          textDecoration: "none",
        }}
      >
        {segment.label}
      </a>
    );
  }

  return (
    <div title={segment.title} style={style}>
      {segment.label}
    </div>
  );
}

