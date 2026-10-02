import { describe, expect, it, vi } from "vitest";

import { PromiseRejectionCollector } from "./promise-rejection-collector";

describe("PromiseRejectionCollector", () => {
  it("captures unhandled promise rejections", () => {
    const captureException = vi.fn();
    const collector = new PromiseRejectionCollector({ captureException });
    collector.start();
    const event = new Event("unhandledrejection") as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: new Error("rejected") });
    window.dispatchEvent(event);
    collector.stop();

    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      source: "window.unhandledrejection",
    });
  });
});
