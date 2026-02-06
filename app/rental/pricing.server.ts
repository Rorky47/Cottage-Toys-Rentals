export type DateOnlyString = `${number}-${number}-${number}`; // YYYY-MM-DD (validated at runtime)

export type RateTier = {
  /** Applies when rentalDays >= minDays */
  minDays: number;
  /** Per-day price in cents */
  pricePerDayCents: number;
};

export type PricingInput = {
  startDate: DateOnlyString;
  endDate: DateOnlyString;
  units: number;
  basePricePerDayCents: number;
  tiers?: RateTier[];
};

export type PricingQuote = {
  rentalDays: number;
  units: number;
  pricePerDayCents: number;
  unitTotalCents: number;
  lineTotalCents: number;
  appliedTierMinDays: number | null;
};

function parseDateOnlyToUtcMs(date: string): number {
  // Expect YYYY-MM-DD; treat as a date-only value in UTC to avoid timezone drift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error(`Invalid date format: ${date}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error(`Invalid date value: ${date}`);
  }
  const ms = Date.UTC(year, month - 1, day);
  // Verify round-trip (catches invalid dates like 2026-02-30)
  const d = new Date(ms);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${date}`);
  }
  return ms;
}

export function countRentalDays(startDate: string, endDate: string): number {
  // Rule: endDate is inclusive.
  // Example: 2026-01-01 → 2026-01-02 => 2 days.
  const startMs = parseDateOnlyToUtcMs(startDate);
  const endMs = parseDateOnlyToUtcMs(endDate);
  const diffDays = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1;
  if (!Number.isFinite(diffDays) || diffDays <= 0) {
    throw new Error(`End date must be on or after start date (start=${startDate}, end=${endDate}).`);
  }
  return diffDays;
}

export function quoteRentalPricing(input: PricingInput): PricingQuote {
  const rentalDays = countRentalDays(input.startDate, input.endDate);

  const units = Math.floor(input.units);
  if (!Number.isFinite(units) || units <= 0) {
    throw new Error(`Units must be a positive integer (units=${String(input.units)}).`);
  }

  const base = Math.floor(input.basePricePerDayCents);
  if (!Number.isFinite(base) || base < 0) {
    throw new Error(`Base price must be a non-negative integer cents value.`);
  }

  const tiers = (input.tiers ?? [])
    .filter((t) => Number.isFinite(t.minDays) && Number.isFinite(t.pricePerDayCents))
    .map((t) => ({ minDays: Math.floor(t.minDays), pricePerDayCents: Math.floor(t.pricePerDayCents) }))
    .filter((t) => t.minDays >= 1 && t.pricePerDayCents >= 0)
    .sort((a, b) => a.minDays - b.minDays);

  // Pick the tier with the highest minDays that is <= rentalDays
  let appliedTier: RateTier | null = null;
  for (const tier of tiers) {
    if (tier.minDays <= rentalDays) appliedTier = tier;
  }

  const pricePerDayCents = appliedTier?.pricePerDayCents ?? base;
  const unitTotalCents = pricePerDayCents * rentalDays;
  const lineTotalCents = unitTotalCents * units;

  return {
    rentalDays,
    units,
    pricePerDayCents,
    unitTotalCents,
    lineTotalCents,
    appliedTierMinDays: appliedTier?.minDays ?? null,
  };
}

