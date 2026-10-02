import type { Collector } from "../types/collector.js";

type ErrorCollectorOptions = {
  captureException: (error: unknown, metadata?: Record<string, unknown>) => void;
  sanitizeUrl?: (url: string) => string;
};

export class ErrorCollector implements Collector {
  private readonly captureException: ErrorCollectorOptions["captureException"];
  private readonly sanitizeUrl: (url: string) => string;

  constructor(options: ErrorCollectorOptions) {
    this.captureException = options.captureException;
    this.sanitizeUrl = options.sanitizeUrl ?? ((url) => url);
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
      filename: event.filename ? this.sanitizeUrl(event.filename) : "",
      lineno: event.lineno,
      colno: event.colno,
    });
  };
}
