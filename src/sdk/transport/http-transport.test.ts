import type { TransportPayload } from "@sdk-types/transport";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpTransport } from "./http-transport";

const payload: TransportPayload = {
  appName: "demo-app",
  events: [],
};

describe("HttpTransport", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends payload using fetch", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const transport = new HttpTransport({
      endpoint: "/api/events",
    });

    await transport.send(payload);

    expect(fetchMock).toHaveBeenCalledWith("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  });

  it("uses sendBeacon on exit when available", () => {
    const sendBeaconMock = vi.fn<(url: string | URL, data?: BodyInit | null) => boolean>(
      () => true,
    );

    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeaconMock,
    });

    const transport = new HttpTransport({
      endpoint: "/api/events",
    });

    transport.sendOnExit(payload);

    expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    expect(sendBeaconMock.mock.calls[0]?.[0]).toBe("/api/events");
  });

  it("falls back to fetch keepalive when sendBeacon is unavailable", () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: undefined,
    });

    const transport = new HttpTransport({
      endpoint: "/api/events",
    });

    transport.sendOnExit(payload);

    expect(fetchMock).toHaveBeenCalledWith("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  });
});
