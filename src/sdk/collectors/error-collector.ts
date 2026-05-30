import type { Collector } from "@sdk-types/collector";

type ErrorCollectorOptions = {
  captureException: (error: unknown, metadata?: Record<string, unknown>) => void;
};

export class ErrorCollector implements Collector {
  private readonly captureException: ErrorCollectorOptions["captureException"];

  constructor(options: ErrorCollectorOptions) {
    this.captureException = options.captureException;
  }

  start(): void {
    window.addEventListener("error", this.handleError);
  }

  stop(): void {
    window.removeEventListener("error", this.handleError);
  }

  private readonly handleError = (event: ErrorEvent): void => {
    this.captureException(event.error ?? event.message, {
      source: "window.error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };
}
