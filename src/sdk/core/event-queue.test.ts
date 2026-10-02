import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MonitorEvent } from "../types/events.js";
import type { Transport } from "../types/transport.js";
import { EventQueue } from "./event-queue";

function createEvent(id: string): MonitorEvent {
  return {
    id,
    type: "error",
    message: `Error ${id}`,
    timestamp: new Date().toISOString(),
    appName: "demo-app",
    url: "http://localhost",
  };
}

function createTransport(): Transport {
  return {
    send: vi.fn<Transport["send"]>().mockResolvedValue(undefined),
    sendOnExit: vi.fn<Transport["sendOnExit"]>().mockReturnValue(true),
  };
}

describe("EventQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("sends batch when batch size is reached", async () => {
    const transport = createTransport();

    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 2,
      flushInterval: 5000,
      maxQueueSize: 10,
      transport,
    });

    queue.add(createEvent("1"));
    queue.add(createEvent("2"));

    await vi.waitFor(() => {
      expect(transport.send).toHaveBeenCalledTimes(1);
    });

    const payload = vi.mocked(transport.send).mock.calls[0]?.[0];

    expect(payload?.events).toHaveLength(2);
  });

  it("sends batch by interval", async () => {
    const transport = createTransport();

    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 10,
      flushInterval: 5000,
      maxQueueSize: 10,
      transport,
    });

    queue.start();
    queue.add(createEvent("1"));

    await vi.advanceTimersByTimeAsync(5000);

    expect(transport.send).toHaveBeenCalledTimes(1);

    queue.stop();
  });

  it("does not grow queue above maxQueueSize", async () => {
    const transport = createTransport();

    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 10,
      flushInterval: 5000,
      maxQueueSize: 2,
      transport,
    });

    queue.add(createEvent("1"));
    queue.add(createEvent("2"));
    queue.add(createEvent("3"));

    await queue.flush();

    const payload = vi.mocked(transport.send).mock.calls[0]?.[0];

    expect(payload?.events.map((event) => event.id)).toEqual(["2", "3"]);
  });

  it("does not throw when transport fails", async () => {
    const transport: Transport = {
      send: vi.fn<Transport["send"]>().mockRejectedValue(new Error("Network failed")),
      sendOnExit: vi.fn<Transport["sendOnExit"]>().mockReturnValue(true),
    };

    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 10,
      flushInterval: 5000,
      maxQueueSize: 10,
      transport,
    });

    queue.add(createEvent("1"));

    await expect(queue.flush()).resolves.toBeUndefined();
  });

  it("uses sendOnExit on page exit flush", () => {
    const transport = createTransport();

    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 10,
      flushInterval: 5000,
      maxQueueSize: 10,
      transport,
    });

    queue.add(createEvent("1"));
    queue.flushOnExit();

    expect(transport.sendOnExit).toHaveBeenCalledTimes(1);

    const payload = vi.mocked(transport.sendOnExit).mock.calls[0]?.[0];

    expect(payload?.events).toHaveLength(1);
    expect(queue.size).toBe(0);
  });

  it("retains queued events after delivery fails", async () => {
    const transport = createTransport();
    vi.mocked(transport.send).mockRejectedValue(new Error("Network failed"));
    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 10,
      flushInterval: 5000,
      maxQueueSize: 10,
      transport,
    });

    queue.add(createEvent("1"));
    await queue.flush();

    expect(queue.size).toBe(1);
  });

  it("does not spin immediate retries after a failed full batch", async () => {
    const transport = createTransport();
    vi.mocked(transport.send).mockRejectedValue(new Error("Network failed"));
    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 1,
      flushInterval: 5000,
      maxQueueSize: 10,
      transport,
    });

    queue.add(createEvent("1"));
    await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1));
    await Promise.resolve();

    expect(transport.send).toHaveBeenCalledTimes(1);
    expect(queue.size).toBe(1);
  });

  it("retains queued events when exit delivery is rejected", () => {
    const transport = createTransport();
    vi.mocked(transport.sendOnExit).mockReturnValue(false);
    const queue = new EventQueue({
      appName: "demo-app",
      batchSize: 10,
      flushInterval: 5000,
      maxQueueSize: 10,
      transport,
    });

    queue.add(createEvent("1"));
    queue.flushOnExit();

    expect(queue.size).toBe(1);
  });
});
