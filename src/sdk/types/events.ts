export type MonitorEventType = "init" | "error";

export type MonitorEvent = {
  id: string;
  type: MonitorEventType;
  message: string;
  timestamp: string;
  appName: string;
  environment?: string;
  release?: string;
  url: string;
  requestId?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
};

export type Breadcrumb = {
  id: string;
  type: "click" | "manual" | "http" | "navigation";
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};
