import { ErrorCollector } from "../collectors/error-collector";
import type { Collector } from "../types/collector";
import type { MonitorConfig } from "../types/config";
import type { MonitorEvent } from "../types/events";
import { normalizeError } from "../utils/normalize-error";

const DEFAULT_CONFIG: Required<MonitorConfig> = {
  appName: "unknown-app",
  enabled: true,
  maxEvents: 100,
};

class FrontendMonitor {
  private config: Required<MonitorConfig> = DEFAULT_CONFIG;
  private events: MonitorEvent[] = [];
  private initialized = false;
  private collectors: Collector[] = [];

  init(config: MonitorConfig): void {
    if (this.initialized) {
      console.warn("[Frontend Black Box] Monitor already initialized");
      return;
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.initialized = true;

    this.collectors = [
      new ErrorCollector({
        captureException: this.captureException.bind(this),
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

    console.info("[Frontend Black Box]", nextEvent);
  }
}

export const monitor = new FrontendMonitor();
