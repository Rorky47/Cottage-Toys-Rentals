// Cart Transform: multiply per-unit price by a line attribute "_cottage_multiplier".
// This does not change product/variant base prices; it overrides the cart line price.

/**
 * @param {any} input
 * @returns {{ operations: Array<{ lineUpdate: { cartLineId: string, price: { adjustment: { fixedPricePerUnit: { amount: string } } } } }> }}
 */
export function run(input) {
  const operations = [];
  const lines = input?.cart?.lines ?? [];

  /**
   * @param {string} s
   */
  function parseDateOnlyUtcMs(s) {
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
    // Use UTC to avoid DST/local timezone issues.
    const ms = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
    if (!Number.isFinite(ms)) return null;
    return ms;
  }

  /**
   * @param {any} line
   */
  function getRentalDays(line) {
    const rawDays = line?.rentalDays?.value;
    if (rawDays != null) {
      const n = Number.parseInt(String(rawDays), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }

    const start = line?.rentalStart?.value;
    const end = line?.rentalEnd?.value;
    if (!start || !end) return null;
    const startMs = parseDateOnlyUtcMs(String(start));
    const endMs = parseDateOnlyUtcMs(String(end));
    if (startMs == null || endMs == null) return null;
    const days = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
    if (!Number.isFinite(days) || days <= 0) return null;
    return days;
  }

  /**
   * Reads optional tier pricing from product metafield `cottage_rentals.pricing`.
   * Expected JSON shape:
   * { basePricePerDayCents: number, tiers: Array<{ minDays: number, pricePerDayCents: number }> }
   *
   * Returns a per-day ratio vs base price (e.g. 0.8) or null if unavailable.
   * @param {any} line
   * @param {number} days
   */
  function getTierRatio(line, days) {
    const raw = line?.merchandise?.product?.rentalPricing?.value;
    if (!raw) return null;
    let cfg;
    try {
      cfg = JSON.parse(String(raw));
    } catch {
      return null;
    }
    const base = Number(cfg?.basePricePerDayCents);
    if (!Number.isFinite(base) || base <= 0) return null;
    const tiers = Array.isArray(cfg?.tiers) ? cfg.tiers : [];
    let chosen = base;
    for (const t of tiers) {
      const minDays = Number(t?.minDays);
      const ppd = Number(t?.pricePerDayCents);
      if (!Number.isFinite(minDays) || !Number.isFinite(ppd)) continue;
      if (minDays <= days && ppd >= 0) chosen = ppd;
    }
    const ratio = chosen / base;
    if (!Number.isFinite(ratio) || ratio <= 0) return null;
    return ratio;
  }

  for (const line of lines) {
    const days = getRentalDays(line);
    if (!days) continue;

    const baseAmount = Number.parseFloat(String(line?.cost?.amountPerQuantity?.amount ?? ""));
    if (!Number.isFinite(baseAmount) || baseAmount < 0) continue;

    const ratio = getTierRatio(line, days);
    const newAmount = (baseAmount * (ratio ?? 1) * days).toFixed(2);

    // Build a nice rental date display
    const start = line?.rentalStart?.value;
    const end = line?.rentalEnd?.value;
    let titleSuffix = '';
    if (start && end) {
      titleSuffix = ` (Rental: ${start} to ${end})`;
    } else if (days) {
      titleSuffix = ` (${days} day rental)`;
    }

    operations.push({
      lineUpdate: {
        cartLineId: line.id,
        title: titleSuffix ? `${line.merchandise?.product?.title || 'Product'}${titleSuffix}` : undefined,
        price: {
          adjustment: {
            fixedPricePerUnit: {
              amount: newAmount,
            },
          },
        },
      },
    });
  }

  return { operations };
}
