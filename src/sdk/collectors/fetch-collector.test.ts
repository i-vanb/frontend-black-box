import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Breadcrumb } from "../types/events.js";
import { FetchCollector } from "./fetch-collector";

type AddBreadcrumb = (breadcrumb: Omit<Breadcrumb, "id" | "timestamp">) => void;

describe("FetchCollector", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds http breadcrumb for successful fetch", async () => {
    const addBreadcrumb = vi.fn<AddBreadcrumb>();

    const originalFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", originalFetch);

    const collector = new FetchCollector({
      addBreadcrumb,
    });

    collector.start();

    await fetch("/api/user");

    const breadcrumb = addBreadcrumb.mock.calls[0]?.[0];

    expect(breadcrumb).toBeDefined();
    expect(breadcrumb?.type).toBe("http");
    expect(breadcrumb?.message).toBe("GET /api/user 200");
    expect(breadcrumb?.metadata?.url).toBe("/api/user");
    expect(breadcrumb?.metadata?.status).toBe(200);
    expect(breadcrumb?.metadata?.ok).toBe(true);
    expect(typeof breadcrumb?.metadata?.duration).toBe("number");

    collector.stop();
  });

  it("does not track ignored urls", async () => {
    const addBreadcrumb = vi.fn<AddBreadcrumb>();

    const originalFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", originalFetch);

    const collector = new FetchCollector({
      addBreadcrumb,
      ignoredUrls: ["/api/monitoring/events"],
    });

    collector.start();

    await fetch("/api/monitoring/events");

    expect(addBreadcrumb).not.toHaveBeenCalled();

    collector.stop();
  });

  it("adds failed http breadcrumb and rethrows error", async () => {
    const addBreadcrumb = vi.fn<AddBreadcrumb>();
    const error = new Error("Network failed");

    const originalFetch = vi.fn<typeof fetch>().mockRejectedValue(error);

    vi.stubGlobal("fetch", originalFetch);

    const collector = new FetchCollector({
      addBreadcrumb,
    });

    collector.start();

    await expect(fetch("/api/user")).rejects.toThrow("Network failed");

    const breadcrumb = addBreadcrumb.mock.calls[0]?.[0];

    expect(breadcrumb).toBeDefined();
    expect(breadcrumb?.type).toBe("http");
    expect(breadcrumb?.message).toBe("GET /api/user failed");
    expect(breadcrumb?.metadata?.url).toBe("/api/user");
    expect(breadcrumb?.metadata?.error).toBe(error);
    expect(typeof breadcrumb?.metadata?.duration).toBe("number");

    collector.stop();
  });

  it("restores a working original fetch on stop", async () => {
    const originalFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(null));

    vi.stubGlobal("fetch", originalFetch);

    const collector = new FetchCollector({
      addBreadcrumb: vi.fn<AddBreadcrumb>(),
    });

    collector.start();

    collector.stop();
    await fetch("/after-stop");

    expect(originalFetch).toHaveBeenCalledWith("/after-stop");
  });

  it("uses method and URL from a Request object", async () => {
    const addBreadcrumb = vi.fn<AddBreadcrumb>();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 })),
    );
    const collector = new FetchCollector({ addBreadcrumb });
    collector.start();

    await fetch(new Request("https://example.test/api/items", { method: "PATCH" }));

    expect(addBreadcrumb.mock.calls[0]?.[0].message).toBe(
      "PATCH https://example.test/api/items 204",
    );
    collector.stop();
  });

  it("removes sensitive query and fragment data from breadcrumbs", async () => {
    const addBreadcrumb = vi.fn<AddBreadcrumb>();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })),
    );
    const collector = new FetchCollector({ addBreadcrumb });
    collector.start();

    await fetch("/api/items?token=secret#private");

    expect(addBreadcrumb.mock.calls[0]?.[0]).toMatchObject({
      message: "GET /api/items 200",
      metadata: { url: "/api/items" },
    });
    collector.stop();
  });
});
