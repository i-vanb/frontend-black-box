import type { MonitorEvent } from "./events.js";

export type TransportPayload = {
  appName: string;
  events: MonitorEvent[];
};

export type Transport = {
  send: (payload: TransportPayload) => Promise<void>;
  sendOnExit: (payload: TransportPayload) => boolean;
};
