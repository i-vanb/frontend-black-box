import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { monitor } from "./monitor.js";

describe("monitor", () => {
  beforeEach(() => {
    monitor.destroy();
    monitor.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    monitor.destroy();
    monitor.clear();
    vi.restoreAllMocks();
  });

  it("applies configured endpoint to ignored URLs before fetch collection starts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 })),
    );
    monitor.init({
      appName: "test-app",
      endpoint: "/api/diagnostics/browser",
      batchSize: 100,
      flushInterval: 60_000,
    });

    await fetch("/api/diagnostics/browser");
    monitor.captureException(new Error("boom"));

    const errorEvent = monitor.getEvents().find((event) => event.type === "error");
    expect(errorEvent?.breadcrumbs).toEqual([]);
  });

  it("sanitizes current URL and bounded context", () => {
    window.history.replaceState(
      {},
      "",
      "/access/abcDEF0123456789_secret-token?token=private#fragment",
    );
    monitor.init({ appName: "test-app", environment: "test", release: "abc123" });
    monitor.setContext({ requestId: "req-1", token: "private" });
    monitor.captureException(new Error("boom"), { email: "person@example.com" });

    const event = monitor.getEvents()[0];
    expect(event).toMatchObject({
      appName: "test-app",
      environment: "test",
      release: "abc123",
      requestId: "req-1",
      url: "/access/:id",
    });
    expect(event?.metadata).toMatchObject({
      requestId: "req-1",
      token: "[Filtered]",
      email: "[FilteredEmail]",
    });
  });

  it("does not log captured events unless debug is enabled", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    monitor.init({ appName: "test-app" });
    monitor.captureException(new Error("boom"));
    expect(info).not.toHaveBeenCalled();
  });

  it("supports explicit navigation breadcrumbs", () => {
    monitor.init({ appName: "test-app" });
    monitor.addNavigationBreadcrumb("/assets/550e8400-e29b-41d4-a716-446655440000?tab=1");
    monitor.captureException(new Error("boom"));

    expect(monitor.getEvents()[0]?.breadcrumbs?.[0]).toMatchObject({
      type: "navigation",
      message: "/assets/:id",
    });
  });
});
