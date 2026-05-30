export type MonitorEventType = "init" | "error";

export type MonitorEvent = {
  id: string;
  type: MonitorEventType;
  message: string;
  timestamp: string;
  appName: string;
  url: string;
  stack?: string;
  metadata?: Record<string, unknown>;
};
