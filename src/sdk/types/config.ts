export type MonitorConfig = {
  appName: string;
  environment?: string;
  release?: string;
  enabled?: boolean;
  maxEvents?: number;
  endpoint?: string;
  flushInterval?: number;
  batchSize?: number;
  maxQueueSize?: number;
  ignoredUrls?: string[];
  requestTimeout?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
  debug?: boolean;
  captureClickText?: boolean;
  sanitizeUrl?: (url: string) => string;
  requestIdHeader?: string;
};
