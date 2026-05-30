import type { Transport, TransportPayload } from "@sdk-types/transport";

type HttpTransportOptions = {
  endpoint: string;
};

export class HttpTransport implements Transport {
  private readonly endpoint: string;

  constructor(options: HttpTransportOptions) {
    this.endpoint = options.endpoint;
  }

  async send(payload: TransportPayload): Promise<void> {
    await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  sendOnExit(payload: TransportPayload): void {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], {
        type: "application/json",
      });

      navigator.sendBeacon(this.endpoint, blob);
      return;
    }

    void fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });
  }
}
