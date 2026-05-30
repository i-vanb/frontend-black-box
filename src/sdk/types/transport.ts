import type { MonitorEvent } from "@sdk/types/events.ts";

export type TransportPayload = {
  appName: string;
  events: MonitorEvent[];
};

export type Transport = {
  send: (payload: TransportPayload) => Promise<void>;
  sendOnExit: (payload: TransportPayload) => void;
};
