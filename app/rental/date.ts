export function parseDateOnlyToUtcDate(dateOnly: string): Date {
  // YYYY-MM-DD -> Date at 00:00:00Z
  return new Date(`${dateOnly}T00:00:00.000Z`);
}

