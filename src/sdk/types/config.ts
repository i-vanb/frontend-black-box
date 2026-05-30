export type MonitorConfig = {
  appName: string;
  enabled?: boolean;
  maxEvents?: number;
  endpoint?: string;
  flushInterval?: number;
  batchSize?: number;
  maxQueueSize?: number;
};
