import { describe, it, expect, vi, beforeEach } from "vitest";

const calendarLoader = vi.fn(async () => new Response("calendar"));
const calendarAction = vi.fn(async () => new Response("calendar-action"));
const webhooksLoader = vi.fn(async () => new Response("webhooks"));
const webhooksAction = vi.fn(async () => new Response("webhooks-action"));

vi.mock("~/features/appPages/calendar", () => ({
  default: () => null,
}));

vi.mock("~/features/appPages/webhooks", () => ({
  default: () => null,
}));

vi.mock("~/features/appPages/calendar.server", () => ({
  loader: calendarLoader,
  action: calendarAction,
}));

vi.mock("~/features/appPages/webhooks.server", () => ({
  loader: webhooksLoader,
  action: webhooksAction,
}));

describe("app.$page route dispatch", () => {
  beforeEach(() => {
    calendarLoader.mockClear();
    calendarAction.mockClear();
    webhooksLoader.mockClear();
    webhooksAction.mockClear();
  });

  it("routes loader to calendar module", async () => {
    const route = await import("./$page");
    await route.loader({ params: { page: "calendar" }, request: new Request("http://localhost/app/calendar") } as any);
    expect(calendarLoader).toHaveBeenCalledOnce();
  });

  it("routes loader to webhooks module", async () => {
    const route = await import("./$page");
    await route.loader({ params: { page: "webhooks" }, request: new Request("http://localhost/app/webhooks") } as any);
    expect(webhooksLoader).toHaveBeenCalledOnce();
  });

  it("returns 404 for unknown page loader", async () => {
    const route = await import("./$page");
    await expect(
      route.loader({ params: { page: "unknown" }, request: new Request("http://localhost/app/unknown") } as any),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("routes action to calendar module", async () => {
    const route = await import("./$page");
    await route.action({
      params: { page: "calendar" },
      request: new Request("http://localhost/app/calendar", { method: "POST" }),
    } as any);
    expect(calendarAction).toHaveBeenCalledOnce();
  });

  it("routes action to webhooks module", async () => {
    const route = await import("./$page");
    await route.action({
      params: { page: "webhooks" },
      request: new Request("http://localhost/app/webhooks", { method: "POST" }),
    } as any);
    expect(webhooksAction).toHaveBeenCalledOnce();
  });
});

