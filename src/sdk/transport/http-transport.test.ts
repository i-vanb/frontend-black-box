import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TransportPayload } from "../types/transport.js";
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

    const requestInit = fetchMock.mock.calls[0]?.[1];
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/events");
    expect(requestInit).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frontend-Black-Box": "1",
      },
      body: JSON.stringify(payload),
    });
    expect(requestInit?.signal).toBeInstanceOf(AbortSignal);
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

    expect(transport.sendOnExit(payload)).toBe(true);

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

    expect(transport.sendOnExit(payload)).toBe(true);

    expect(fetchMock).toHaveBeenCalledWith("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frontend-Black-Box": "1",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  });

  it("rejects non-success responses", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new HttpTransport({ endpoint: "/api/events", maxRetries: 0 });

    await expect(transport.send(payload)).rejects.toMatchObject({ status: 400 });
  });

  it("retries retryable failures with a bound", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new HttpTransport({
      endpoint: "/api/events",
      maxRetries: 1,
      retryBaseDelay: 10,
    });

    const promise = transport.send(payload);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("falls back to keepalive fetch when sendBeacon rejects the payload", () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: vi.fn(() => false),
    });
    const transport = new HttpTransport({ endpoint: "/api/events" });

    expect(transport.sendOnExit(payload)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts a timed-out request and rejects after bounded attempts", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>((_input, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const transport = new HttpTransport({ endpoint: "/api/events", timeout: 500, maxRetries: 0 });

    const promise = transport.send(payload);
    const expectation = expect(promise).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(500);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
