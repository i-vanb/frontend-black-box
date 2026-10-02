import { describe, expect, it, vi } from "vitest";

import { ErrorCollector } from "./error-collector";

describe("ErrorCollector", () => {
  it("captures window errors and stops cleanly", () => {
    const captureException = vi.fn();
    const collector = new ErrorCollector({ captureException });
    collector.start();
    window.dispatchEvent(
      new ErrorEvent("error", {
        error: new Error("boom"),
        filename: "app.js",
        lineno: 10,
        colno: 4,
      }),
    );
    collector.stop();

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException.mock.calls[0]?.[1]).toMatchObject({
      source: "window.error",
      filename: "app.js",
    });
  });
});
