import { describe, it, expect, vi, beforeEach } from "vitest";

const bookingFindMany = vi.fn();
const rentalItemFindUnique = vi.fn();

vi.mock("~/db.server", () => ({
  default: {
    booking: { findMany: (...args: unknown[]) => bookingFindMany(...args) },
    rentalItem: { findUnique: (...args: unknown[]) => rentalItemFindUnique(...args) },
  },
}));

beforeEach(() => {
  bookingFindMany.mockReset();
  rentalItemFindUnique.mockReset();
});

describe("isAvailable", () => {
  it("returns true when no bookings and quantity <= item.quantity", async () => {
    bookingFindMany.mockResolvedValue([]);
    rentalItemFindUnique.mockResolvedValue({ quantity: 2 });

    const { isAvailable } = await import("../availability.server");
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-02-05T00:00:00.000Z");

    const result = await isAvailable("item-1", start, end, 2);
    expect(result).toBe(true);
    expect(bookingFindMany).toHaveBeenCalledOnce();
    expect(rentalItemFindUnique).toHaveBeenCalledWith({
      where: { id: "item-1" },
      select: { quantity: true },
    });
  });

  it("returns false when requested quantity would exceed item.quantity", async () => {
    bookingFindMany.mockResolvedValue([]);
    rentalItemFindUnique.mockResolvedValue({ quantity: 1 });

    const { isAvailable } = await import("../availability.server");
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-02-05T00:00:00.000Z");

    const result = await isAvailable("item-1", start, end, 2);
    expect(result).toBe(false);
  });

  it("returns false when conflicting CONFIRMED bookings use all units", async () => {
    bookingFindMany.mockResolvedValue([{ units: 2 }]);
    rentalItemFindUnique.mockResolvedValue({ quantity: 2 });

    const { isAvailable } = await import("../availability.server");
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-02-05T00:00:00.000Z");

    const result = await isAvailable("item-1", start, end, 1);
    expect(result).toBe(false);
  });

  it("returns true when conflicting bookings leave enough units", async () => {
    bookingFindMany.mockResolvedValue([{ units: 1 }]);
    rentalItemFindUnique.mockResolvedValue({ quantity: 3 });

    const { isAvailable } = await import("../availability.server");
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-02-05T00:00:00.000Z");

    const result = await isAvailable("item-1", start, end, 2);
    expect(result).toBe(true);
  });

  it("treats missing rental item as quantity 0", async () => {
    bookingFindMany.mockResolvedValue([]);
    rentalItemFindUnique.mockResolvedValue(null);

    const { isAvailable } = await import("../availability.server");
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-02-05T00:00:00.000Z");

    const result = await isAvailable("item-missing", start, end, 1);
    expect(result).toBe(false);
  });

  it("sums multiple overlapping bookings correctly", async () => {
    bookingFindMany.mockResolvedValue([{ units: 1 }, { units: 1 }]);
    rentalItemFindUnique.mockResolvedValue({ quantity: 2 });

    const { isAvailable } = await import("../availability.server");
    const start = new Date("2026-02-01T00:00:00.000Z");
    const end = new Date("2026-02-05T00:00:00.000Z");

    const result = await isAvailable("item-1", start, end, 1);
    expect(result).toBe(false);
  });
});
