import type { Collector } from "../types/collector.js";
import type { Breadcrumb } from "../types/events.js";
import { sanitizeUrl as defaultSanitizeUrl } from "../utils/sanitize-url.js";

type FetchCollectorOptions = {
  addBreadcrumb: (breadcrumb: Omit<Breadcrumb, "id" | "timestamp">) => void;
  ignoredUrls?: string[];
  sanitizeUrl?: (url: string) => string;
  requestIdHeader?: string;
  setRequestId?: (requestId: string) => void;
};

export class FetchCollector implements Collector {
  private readonly addBreadcrumb: FetchCollectorOptions["addBreadcrumb"];
  private readonly ignoredUrls: string[];
  private readonly sanitizeUrl: (url: string) => string;
  private readonly requestIdHeader: string | undefined;
  private readonly setRequestId: ((requestId: string) => void) | undefined;
  private originalFetch: typeof window.fetch | undefined;

  constructor(options: FetchCollectorOptions) {
    this.addBreadcrumb = options.addBreadcrumb;
    this.ignoredUrls = options.ignoredUrls ?? [];
    this.sanitizeUrl = options.sanitizeUrl ?? defaultSanitizeUrl;
    this.requestIdHeader = options.requestIdHeader;
    this.setRequestId = options.setRequestId;
  }

  start(): void {
    if (this.originalFetch) {
      return;
    }

    this.originalFetch = window.fetch.bind(window);
    const originalFetch = this.originalFetch;

    window.fetch = async (...args) => {
      const startedAt = performance.now();
      const requestInfo = args[0];
      const requestInit = args[1];

      const url = this.getRequestUrl(requestInfo);
      const safeUrl = this.sanitizeUrl(url);
      const method = this.getRequestMethod(requestInfo, requestInit);

      if (this.shouldIgnoreUrl(url)) {
        return originalFetch(...args);
      }

      try {
        const response = await originalFetch(...args);
        const duration = Math.round(performance.now() - startedAt);
        const requestId = this.requestIdHeader
          ? response.headers.get(this.requestIdHeader)?.trim()
          : null;
        if (requestId && !requestId.includes(",") && /^[A-Za-z0-9_.:-]{1,128}$/.test(requestId)) {
          this.setRequestId?.(requestId);
        }

        this.addBreadcrumb({
          type: "http",
          message: `${method} ${safeUrl} ${response.status}`,
          metadata: {
            url: safeUrl,
            status: response.status,
            ok: response.ok,
            duration,
          },
        });

        return response;
      } catch (error) {
        const duration = Math.round(performance.now() - startedAt);

        this.addBreadcrumb({
          type: "http",
          message: `${method} ${safeUrl} failed`,
          metadata: {
            url: safeUrl,
            duration,
            error,
          },
        });

        throw error;
      }
    };
  }

  stop(): void {
    if (!this.originalFetch) {
      return;
    }

    window.fetch = this.originalFetch;
    this.originalFetch = undefined;
  }

  private getRequestUrl(requestInfo: RequestInfo | URL): string {
    if (typeof requestInfo === "string") {
      return requestInfo;
    }

    if (requestInfo instanceof URL) {
      return requestInfo.toString();
    }

    return requestInfo.url;
  }

  private shouldIgnoreUrl(url: string): boolean {
    return this.ignoredUrls.some((ignoredUrl) => url.includes(ignoredUrl));
  }

  private getRequestMethod(requestInfo: RequestInfo | URL, requestInit?: RequestInit): string {
    if (requestInit?.method) {
      return requestInit.method.toUpperCase();
    }

    if (requestInfo instanceof Request) {
      return requestInfo.method.toUpperCase();
    }

    return "GET";
  }
}
