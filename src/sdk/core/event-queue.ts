import type { MonitorEvent } from "../types/events.js";
import type { Transport } from "../types/transport.js";

type EventQueueOptions = {
  appName: string;
  batchSize: number;
  flushInterval: number;
  transport?: Transport;
  maxQueueSize: number;
};

export class EventQueue {
  private readonly appName: string;
  private readonly batchSize: number;
  private readonly flushInterval: number;

  private readonly maxQueueSize: number;
  private readonly transport: Transport | undefined;

  private events: MonitorEvent[] = [];
  private flushTimerId: number | undefined;
  private isFlushing = false;

  constructor(options: EventQueueOptions) {
    this.appName = options.appName;
    this.maxQueueSize = Math.max(1, Math.min(1_000, options.maxQueueSize));
    this.batchSize = Math.max(1, Math.min(100, options.batchSize));
    this.flushInterval = Math.max(1_000, Math.min(60_000, options.flushInterval));
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

    this.events = [...this.events, event].slice(-this.maxQueueSize);

    if (this.events.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.transport || this.events.length === 0 || this.isFlushing) {
      return;
    }

    this.isFlushing = true;

    const eventsToSend = this.events.slice(0, this.batchSize);
    let delivered = false;

    try {
      await this.transport.send({
        appName: this.appName,
        events: eventsToSend,
      });

      const sentIds = new Set(eventsToSend.map((event) => event.id));
      this.events = this.events.filter((event) => !sentIds.has(event.id));
      delivered = true;
    } catch {
      // Monitoring must never break the host app.
    } finally {
      this.isFlushing = false;
      if (delivered && this.events.length >= this.batchSize) {
        void this.flush();
      }
    }
  }

  flushOnExit(): void {
    if (!this.transport || this.events.length === 0) {
      return;
    }

    const eventsToSend = this.events.slice(0, this.batchSize);

    const accepted = this.transport.sendOnExit({
      appName: this.appName,
      events: eventsToSend,
    });

    if (accepted) {
      const sentIds = new Set(eventsToSend.map((event) => event.id));
      this.events = this.events.filter((event) => !sentIds.has(event.id));
    }
  }

  get size(): number {
    return this.events.length;
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
