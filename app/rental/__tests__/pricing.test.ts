import { describe, it, expect } from "vitest";
import { countRentalDays, quoteRentalPricing } from "../pricing.server";

describe("countRentalDays", () => {
  it("returns 1 for same start and end date", () => {
    expect(countRentalDays("2026-02-01", "2026-02-01")).toBe(1);
  });

  it("returns 2 for consecutive days", () => {
    expect(countRentalDays("2026-01-01", "2026-01-02")).toBe(2);
  });

  it("returns 15 for two-week range", () => {
    expect(countRentalDays("2026-02-01", "2026-02-15")).toBe(15);
  });

  it("throws when end date is before start date", () => {
    expect(() => countRentalDays("2026-02-15", "2026-02-01")).toThrow(
      /End date must be on or after start date/
    );
  });

  it("throws for invalid date format", () => {
    expect(() => countRentalDays("2026/02/01", "2026-02-15")).toThrow(/Invalid date format/);
    expect(() => countRentalDays("2026-02-01", "02-15-2026")).toThrow(/Invalid date format/);
  });

  it("throws for invalid calendar date", () => {
    expect(() => countRentalDays("2026-02-30", "2026-03-01")).toThrow(/Invalid calendar date/);
  });
});

describe("quoteRentalPricing", () => {
  it("uses flat base price when no tiers", () => {
    const quote = quoteRentalPricing({
      startDate: "2026-02-01",
      endDate: "2026-02-05",
      units: 1,
      basePricePerDayCents: 1000,
    });
    expect(quote.rentalDays).toBe(5);
    expect(quote.pricePerDayCents).toBe(1000);
    expect(quote.unitTotalCents).toBe(5000);
    expect(quote.lineTotalCents).toBe(5000);
    expect(quote.appliedTierMinDays).toBeNull();
  });

  it("applies single tier when rentalDays >= minDays", () => {
    const quote = quoteRentalPricing({
      startDate: "2026-02-01",
      endDate: "2026-02-15",
      units: 2,
      basePricePerDayCents: 1000,
      tiers: [{ minDays: 10, pricePerDayCents: 800 }],
    });
    expect(quote.rentalDays).toBe(15);
    expect(quote.appliedTierMinDays).toBe(10);
    expect(quote.pricePerDayCents).toBe(800);
    expect(quote.unitTotalCents).toBe(800 * 15);
    expect(quote.lineTotalCents).toBe(800 * 15 * 2);
  });

  it("uses base price when rentalDays below tier minDays", () => {
    const quote = quoteRentalPricing({
      startDate: "2026-02-01",
      endDate: "2026-02-05",
      units: 1,
      basePricePerDayCents: 1000,
      tiers: [{ minDays: 10, pricePerDayCents: 800 }],
    });
    expect(quote.rentalDays).toBe(5);
    expect(quote.appliedTierMinDays).toBeNull();
    expect(quote.pricePerDayCents).toBe(1000);
    expect(quote.lineTotalCents).toBe(1000 * 5);
  });

  it("picks highest qualifying tier when multiple tiers", () => {
    const quote = quoteRentalPricing({
      startDate: "2026-02-01",
      endDate: "2026-02-20",
      units: 1,
      basePricePerDayCents: 1000,
      tiers: [
        { minDays: 5, pricePerDayCents: 900 },
        { minDays: 10, pricePerDayCents: 800 },
        { minDays: 15, pricePerDayCents: 700 },
      ],
    });
    expect(quote.rentalDays).toBe(20);
    expect(quote.appliedTierMinDays).toBe(15);
    expect(quote.pricePerDayCents).toBe(700);
    expect(quote.lineTotalCents).toBe(700 * 20);
  });

  it("multiplies by units correctly", () => {
    const quote = quoteRentalPricing({
      startDate: "2026-02-01",
      endDate: "2026-02-03",
      units: 3,
      basePricePerDayCents: 500,
    });
    expect(quote.rentalDays).toBe(3);
    expect(quote.units).toBe(3);
    expect(quote.unitTotalCents).toBe(500 * 3);
    expect(quote.lineTotalCents).toBe(500 * 3 * 3);
  });

  it("throws for invalid units", () => {
    expect(() =>
      quoteRentalPricing({
        startDate: "2026-02-01",
        endDate: "2026-02-05",
        units: 0,
        basePricePerDayCents: 1000,
      })
    ).toThrow(/Units must be a positive integer/);

    expect(() =>
      quoteRentalPricing({
        startDate: "2026-02-01",
        endDate: "2026-02-05",
        units: -1,
        basePricePerDayCents: 1000,
      })
    ).toThrow(/Units must be a positive integer/);
  });

  it("throws for negative base price", () => {
    expect(() =>
      quoteRentalPricing({
        startDate: "2026-02-01",
        endDate: "2026-02-05",
        units: 1,
        basePricePerDayCents: -100,
      })
    ).toThrow(/Base price must be a non-negative integer/);
  });
});
