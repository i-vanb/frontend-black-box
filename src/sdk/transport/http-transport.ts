import type { Transport, TransportPayload } from "../types/transport.js";

type HttpTransportOptions = {
  endpoint: string;
  timeout?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
};

export class HttpTransportError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "HttpTransportError";
    this.status = status;
  }
}

export class HttpTransport implements Transport {
  private readonly endpoint: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelay: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpTransportOptions) {
    this.endpoint = options.endpoint;
    this.timeout = Math.max(500, Math.min(30_000, options.timeout ?? 5_000));
    this.maxRetries = Math.max(0, Math.min(3, options.maxRetries ?? 2));
    this.retryBaseDelay = Math.max(50, Math.min(5_000, options.retryBaseDelay ?? 250));
    this.fetchImpl = window.fetch.bind(window);
  }

  async send(payload: TransportPayload): Promise<void> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        await this.sendAttempt(payload);
        return;
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error) || attempt === this.maxRetries) break;
        await this.delay(this.retryBaseDelay * 2 ** attempt);
      }
    }

    throw lastError;
  }

  sendOnExit(payload: TransportPayload): boolean {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], {
        type: "application/json",
      });

      if (navigator.sendBeacon(this.endpoint, blob)) {
        return true;
      }
    }

    try {
      void this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frontend-Black-Box": "1",
        },
        body,
        keepalive: true,
      }).catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  private async sendAttempt(payload: TransportPayload): Promise<void> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frontend-Black-Box": "1",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new HttpTransportError(
          `Monitoring delivery failed with status ${response.status}`,
          response.status,
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (!(error instanceof HttpTransportError)) return true;
    return (
      error.status === 408 ||
      error.status === 429 ||
      (error.status !== undefined && error.status >= 500)
    );
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}
