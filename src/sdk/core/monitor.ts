import { ClickCollector } from "../collectors/click-collector.js";
import { ErrorCollector } from "../collectors/error-collector.js";
import { FetchCollector } from "../collectors/fetch-collector.js";
import { PromiseRejectionCollector } from "../collectors/promise-rejection-collector.js";
import { BreadcrumbStore } from "../storage/breadcrumb-store.js";
import { HttpTransport } from "../transport/http-transport.js";
import type { Collector } from "../types/collector.js";
import type { MonitorConfig } from "../types/config.js";
import type { Breadcrumb, MonitorEvent } from "../types/events.js";
import type { Transport } from "../types/transport.js";
import { normalizeError } from "../utils/normalize-error.js";
import { sanitizeUrl as defaultSanitizeUrl } from "../utils/sanitize-url.js";
import { sanitizeValue } from "../utils/sanitize.js";
import { EventQueue } from "./event-queue.js";

const DEFAULT_CONFIG: Required<MonitorConfig> = {
  appName: "unknown-app",
  environment: "production",
  release: "unknown",
  enabled: true,
  maxEvents: 100,
  endpoint: "",
  flushInterval: 5000,
  batchSize: 10,
  maxQueueSize: 100,
  ignoredUrls: [],
  requestTimeout: 5000,
  maxRetries: 2,
  retryBaseDelay: 250,
  debug: false,
  captureClickText: false,
  sanitizeUrl: defaultSanitizeUrl,
};

class FrontendMonitor {
  private config: Required<MonitorConfig> = DEFAULT_CONFIG;
  private events: MonitorEvent[] = [];
  private initialized = false;
  private collectors: Collector[] = [];
  private readonly breadcrumbStore = new BreadcrumbStore();
  private eventQueue: EventQueue | undefined;
  private context: Record<string, unknown> = {};

  init(config: MonitorConfig): void {
    if (this.initialized) {
      return;
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      maxEvents: Math.max(1, Math.min(1_000, config.maxEvents ?? DEFAULT_CONFIG.maxEvents)),
    };

    const ignoredUrls = [
      ...this.config.ignoredUrls,
      ...(this.config.endpoint ? [this.config.endpoint] : []),
    ];

    const transport: Transport | undefined = this.config.endpoint
      ? new HttpTransport({
          endpoint: this.config.endpoint,
          timeout: this.config.requestTimeout,
          maxRetries: this.config.maxRetries,
          retryBaseDelay: this.config.retryBaseDelay,
        })
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
        sanitizeUrl: this.config.sanitizeUrl,
      }),
      new PromiseRejectionCollector({
        captureException: this.captureException.bind(this),
      }),
      new ClickCollector({
        addBreadcrumb: this.addBreadcrumb.bind(this),
        captureText: this.config.captureClickText,
      }),
      new FetchCollector({
        addBreadcrumb: this.addBreadcrumb.bind(this),
        ignoredUrls,
        sanitizeUrl: this.config.sanitizeUrl,
      }),
    ];

    this.collectors.forEach((collector) => {
      collector.start();
    });

    this.addEvent({
      type: "init",
      message: "Monitor initialized",
      metadata: {
        environment: this.config.environment,
        release: this.config.release,
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

  setContext(context: Record<string, unknown>): void {
    this.context = sanitizeValue(context) as Record<string, unknown>;
  }

  clearContext(): void {
    this.context = {};
  }

  addNavigationBreadcrumb(url: string): void {
    this.addBreadcrumb({
      type: "navigation",
      message: this.config.sanitizeUrl(url),
    });
  }

  destroy(): void {
    this.collectors.forEach((collector) => {
      collector.stop();
    });

    this.collectors = [];
    this.initialized = false;

    this.eventQueue?.stop();
    this.eventQueue = undefined;
    this.context = {};
  }

  addBreadcrumb(breadcrumb: Omit<Breadcrumb, "id" | "timestamp">): void {
    const sanitizedBreadcrumb = sanitizeValue(breadcrumb) as Omit<Breadcrumb, "id" | "timestamp">;

    this.breadcrumbStore.add(sanitizedBreadcrumb);
  }

  private addEvent(event: Omit<MonitorEvent, "id" | "timestamp" | "appName" | "url">): void {
    if (!this.config.enabled) return;

    const sanitizedEvent = sanitizeValue(event) as Omit<
      MonitorEvent,
      "id" | "timestamp" | "appName" | "url"
    >;

    const nextEvent: MonitorEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      appName: this.config.appName,
      environment: this.config.environment,
      release: this.config.release,
      url: this.config.sanitizeUrl(window.location.href),
      ...(typeof this.context.requestId === "string" ? { requestId: this.context.requestId } : {}),
      ...sanitizedEvent,
      metadata: {
        ...this.context,
        ...(sanitizedEvent.metadata ?? {}),
      },
    };

    this.events = [nextEvent, ...this.events].slice(0, this.config.maxEvents);

    this.eventQueue?.add(nextEvent);

    if (this.config.debug) {
      console.info("[Frontend Black Box]", nextEvent);
    }
  }
}

export const monitor = new FrontendMonitor();
