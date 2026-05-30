export type MonitorConfig = {
  appName: string;
  enabled?: boolean;
  maxEvents?: number;
};

export type MonitorEvent = {
  id: string;
  type: "init" | "error" | "promise-error" | "breadcrumb";
  message: string;
  timestamp: string;
  appName: string;
  url: string;
  metadata?: Record<string, unknown>;
};