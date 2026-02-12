import { describe, it, expect, vi, beforeEach } from "vitest";

const authenticateWebhook = vi.fn(async () => ({
  shop: "testinggroundforautoproduct.myshopify.com",
  topic: "orders/paid",
  payload: {
    id: "gid://shopify/Order/1",
    currency: "USD",
    cart_token: null,
    line_items: [
      {
        product_id: "9169055023319",
        quantity: 2,
        title: "Test rental",
        price: "10.00",
        properties: [
          { name: "rental_start", value: "2026-01-30" },
          { name: "rental_end", value: "2026-01-31" },
          { name: "cottage_cart_token", value: "abc123" },
        ],
      },
    ],
  },
}));

vi.mock("~/shopify", () => ({
  authenticate: {
    webhook: () => authenticateWebhook(),
  },
}));

const prismaMock = {
  rentalItem: {
    upsert: vi.fn(async () => ({ id: "ri_1" })),
  },
  booking: {
    updateMany: vi.fn(async () => ({ count: 1 })),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
  },
};

vi.mock("~/db.server", () => ({
  default: prismaMock,
}));

describe("ordersPaid webhook reservation promotion", () => {
  beforeEach(() => {
    authenticateWebhook.mockClear();
    prismaMock.rentalItem.upsert.mockClear();
    prismaMock.booking.updateMany.mockClear();
    prismaMock.booking.findFirst.mockClear();
    prismaMock.booking.create.mockClear();
  });

  it("promotes RESERVED(cart:<token>) bookings to CONFIRMED via updateMany and does not create a new booking", async () => {
    const mod = await import("./ordersPaid");
    const res = await mod.action({ request: new Request("http://localhost/webhooks/orders/paid", { method: "POST" }) } as any);
    expect(res).toBeInstanceOf(Response);

    expect(prismaMock.booking.updateMany).toHaveBeenCalledOnce();
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });
});

