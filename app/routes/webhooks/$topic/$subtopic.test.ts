import { describe, it, expect, vi, beforeEach } from "vitest";

const ordersPaidAction = vi.fn(async () => new Response("orders-paid"));
const appScopesUpdateAction = vi.fn(async () => new Response("app-scopes-update"));
const appUninstalledAction = vi.fn(async () => new Response("app-uninstalled"));

vi.mock("~/features/webhooks/ordersPaid", () => ({
  action: ordersPaidAction,
}));

vi.mock("~/features/webhooks/appScopesUpdate", () => ({
  action: appScopesUpdateAction,
}));

vi.mock("~/features/webhooks/appUninstalled", () => ({
  action: appUninstalledAction,
}));

describe("webhooks.$topic.$subtopic route dispatch", () => {
  beforeEach(() => {
    ordersPaidAction.mockClear();
    appScopesUpdateAction.mockClear();
    appUninstalledAction.mockClear();
  });

  it("routes action to orders/paid", async () => {
    const route = await import("./$subtopic");
    await route.action({
      params: { topic: "orders", subtopic: "paid" },
      request: new Request("http://localhost/webhooks/orders/paid", { method: "POST" }),
    } as any);
    expect(ordersPaidAction).toHaveBeenCalledOnce();
  });

  it("routes action to app/scopes_update", async () => {
    const route = await import("./$subtopic");
    await route.action({
      params: { topic: "app", subtopic: "scopes_update" },
      request: new Request("http://localhost/webhooks/app/scopes_update", { method: "POST" }),
    } as any);
    expect(appScopesUpdateAction).toHaveBeenCalledOnce();
  });

  it("routes action to app/uninstalled", async () => {
    const route = await import("./$subtopic");
    await route.action({
      params: { topic: "app", subtopic: "uninstalled" },
      request: new Request("http://localhost/webhooks/app/uninstalled", { method: "POST" }),
    } as any);
    expect(appUninstalledAction).toHaveBeenCalledOnce();
  });

  it("returns 404 for unknown topic", async () => {
    const route = await import("./$subtopic");
    const res = (await route.action({
      params: { topic: "unknown", subtopic: "topic" },
      request: new Request("http://localhost/webhooks/unknown/topic", { method: "POST" }),
    } as any)) as Response;
    expect(res.status).toBe(404);
  });
});

