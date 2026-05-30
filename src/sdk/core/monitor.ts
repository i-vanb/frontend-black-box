import { ClickCollector } from "@collectors/click-collector";
import { ErrorCollector } from "@collectors/error-collector";
import { PromiseRejectionCollector } from "@collectors/promise-rejection-collector";
import { EventQueue } from "@core/event-queue";
import type { Collector } from "@sdk-types/collector";
import type { MonitorConfig } from "@sdk-types/config";
import type { Breadcrumb, MonitorEvent } from "@sdk-types/events";
import type { Transport } from "@sdk-types/transport";
import { HttpTransport } from "@sdk/transport/http-transport";
import { BreadcrumbStore } from "@storage/breadcrumb-store";
import { normalizeError } from "@utils/normalize-error";

const DEFAULT_CONFIG: Required<MonitorConfig> = {
  appName: "unknown-app",
  enabled: true,
  maxEvents: 100,
  endpoint: "",
  flushInterval: 5000,
  batchSize: 10,
  maxQueueSize: 100,
};

class FrontendMonitor {
  private config: Required<MonitorConfig> = DEFAULT_CONFIG;
  private events: MonitorEvent[] = [];
  private initialized = false;
  private collectors: Collector[] = [];
  private readonly breadcrumbStore = new BreadcrumbStore();
  private eventQueue: EventQueue | undefined;

  init(config: MonitorConfig): void {
    if (this.initialized) {
      console.warn("[Frontend Black Box] Monitor already initialized");
      return;
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    const transport: Transport | undefined = this.config.endpoint
      ? new HttpTransport({ endpoint: this.config.endpoint })
      : undefined;

    this.eventQueue = new EventQueue({
      appName: this.config.appName,
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      maxQueueSize: this.config.maxQueueSize,
      ...(transport ? { transport } : {}),
    });

    this.eventQueue.start();

    this.initialized = true;

    this.collectors = [
      new ErrorCollector({
        captureException: this.captureException.bind(this),
      }),
      new PromiseRejectionCollector({
        captureException: this.captureException.bind(this),
      }),
      new ClickCollector({
        addBreadcrumb: this.addBreadcrumb.bind(this),
      }),
    ];

    this.collectors.forEach((collector) => {
      collector.start();
    });

    this.addEvent({
      type: "init",
      message: "Monitor initialized",
      metadata: {
        config: this.config,
      },
    });
  }

  captureException(error: unknown, metadata?: Record<string, unknown>): void {
    const normalizedError = normalizeError(error);

    this.addEvent({
      type: "error",
      message: normalizedError.message,
      ...(normalizedError.stack ? { stack: normalizedError.stack } : {}),
      breadcrumbs: this.breadcrumbStore.getAll(),
      metadata: {
        ...metadata,
        ...(normalizedError.name ? { name: normalizedError.name } : {}),
        ...(normalizedError.originalValue !== undefined
          ? { originalValue: normalizedError.originalValue }
          : {}),
      },
    });
  }

  getEvents(): MonitorEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }

  destroy(): void {
    this.collectors.forEach((collector) => {
      collector.stop();
    });

    this.collectors = [];
    this.initialized = false;

    this.eventQueue?.stop();
    this.eventQueue = undefined;
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, "id" | "timestamp">): void {
    this.breadcrumbStore.add(breadcrumb);
  }

  private addEvent(event: Omit<MonitorEvent, "id" | "timestamp" | "appName" | "url">): void {
    if (!this.config.enabled) return;

    const nextEvent: MonitorEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      appName: this.config.appName,
      url: window.location.href,
      ...event,
    };

    this.events = [nextEvent, ...this.events].slice(0, this.config.maxEvents);

    this.eventQueue?.add(nextEvent);

    console.info("[Frontend Black Box]", nextEvent);
  }
}

export const monitor = new FrontendMonitor();
