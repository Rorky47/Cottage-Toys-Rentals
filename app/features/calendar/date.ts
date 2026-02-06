import type { WeekCell } from "~/features/calendar/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateOnly(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function dateOnlyToUtcMs(dateOnly: string): number {
  return Date.parse(`${dateOnly}T00:00:00.000Z`);
}

export function buildMonthWeeks(opts: { year: number; month: number }): { weeks: WeekCell[][]; calendarStartMs: number } {
  const { year, month } = opts;

  const monthStartUtcMs = Date.UTC(year, month, 1);
  const startDow = new Date(monthStartUtcMs).getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const calendarStartMs = monthStartUtcMs - startDow * DAY_MS;
  const weekCount = Math.ceil((startDow + daysInMonth) / 7);

  const weeks: WeekCell[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: WeekCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const idx = w * 7 + dow;
      const d = new Date(calendarStartMs + idx * DAY_MS);
      week.push({
        date: toDateOnly(d),
        dayNumber: d.getUTCDate(),
        inMonth: d.getUTCMonth() === month,
      });
    }
    weeks.push(week);
  }

  return { weeks, calendarStartMs };
}

