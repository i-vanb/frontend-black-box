import type { Collector } from "@sdk-types/collector";

type PromiseRejectionCollectorOptions = {
  captureException: (error: unknown, metadata?: Record<string, unknown>) => void;
};

export class PromiseRejectionCollector implements Collector {
  private readonly captureException: PromiseRejectionCollectorOptions["captureException"];

  constructor(options: PromiseRejectionCollectorOptions) {
    this.captureException = options.captureException;
  }

  start(): void {
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  stop(): void {
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  private readonly handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    this.captureException(event.reason, {
      source: "window.unhandledrejection",
    });
  };
}
