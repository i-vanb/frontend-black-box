import type { MonitorConfig, MonitorEvent } from "./types";

const DEFAULT_CONFIG: Required<MonitorConfig> = {
  appName: "unknown-app",
  enabled: true,
  maxEvents: 100,
};

class FrontendMonitor {
  private config: Required<MonitorConfig> = DEFAULT_CONFIG;
  private events: MonitorEvent[] = [];
  private initialized = false;

  init(config: MonitorConfig) {
    if (this.initialized) {
      console.warn("[Frontend Black Box] Monitor already initialized");
      return;
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.initialized = true;

    this.addEvent({
      type: "init",
      message: "Monitor initialized",
      metadata: {
        config: this.config,
      },
    });
  }

  getEvents() {
    return this.events;
  }

  clear() {
    this.events = [];
  }

  private addEvent(
    event: Omit<MonitorEvent, "id" | "timestamp" | "appName" | "url">
  ) {
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