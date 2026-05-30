import type { MonitorEvent } from "@sdk-types/events";
import type { Transport } from "@sdk-types/transport";

type EventQueueOptions = {
  appName: string;
  batchSize: number;
  flushInterval: number;
  transport?: Transport;
};

export class EventQueue {
  private readonly appName: string;
  private readonly batchSize: number;
  private readonly flushInterval: number;
  private readonly transport: Transport | undefined;

  private events: MonitorEvent[] = [];
  private flushTimerId: number | undefined;

  constructor(options: EventQueueOptions) {
    this.appName = options.appName;
    this.batchSize = options.batchSize;
    this.flushInterval = options.flushInterval;
    this.transport = options.transport;
  }

  start(): void {
    if (!this.transport) {
      return;
    }

    this.flushTimerId = window.setInterval(() => {
      void this.flush();
    }, this.flushInterval);

    window.addEventListener("pagehide", this.handlePageExit);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  stop(): void {
    if (this.flushTimerId !== undefined) {
      window.clearInterval(this.flushTimerId);
      this.flushTimerId = undefined;
    }

    window.removeEventListener("pagehide", this.handlePageExit);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
  }

  add(event: MonitorEvent): void {
    if (!this.transport) {
      return;
    }

    this.events = [...this.events, event];

    if (this.events.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.transport || this.events.length === 0) {
      return;
    }

    const eventsToSend = this.events.slice(0, this.batchSize);

    try {
      await this.transport.send({
        appName: this.appName,
        events: eventsToSend,
      });

      this.events = this.events.slice(eventsToSend.length);
    } catch {
      // Monitoring must never break the host app.
    }
  }

  flushOnExit(): void {
    if (!this.transport || this.events.length === 0) {
      return;
    }

    const eventsToSend = this.events.slice(0, this.batchSize);

    this.transport.sendOnExit({
      appName: this.appName,
      events: eventsToSend,
    });

    this.events = this.events.slice(eventsToSend.length);
  }

  private readonly handlePageExit = (): void => {
    this.flushOnExit();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === "hidden") {
      this.flushOnExit();
    }
  };
}
