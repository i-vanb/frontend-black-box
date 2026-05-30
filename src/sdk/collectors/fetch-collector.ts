import type { Collector } from "@sdk-types/collector";
import type { Breadcrumb } from "@sdk-types/events";

type FetchCollectorOptions = {
  addBreadcrumb: (breadcrumb: Omit<Breadcrumb, "id" | "timestamp">) => void;
  ignoredUrls?: string[];
};

export class FetchCollector implements Collector {
  private readonly addBreadcrumb: FetchCollectorOptions["addBreadcrumb"];
  private readonly ignoredUrls: string[];
  private originalFetch: typeof window.fetch | undefined;

  constructor(options: FetchCollectorOptions) {
    this.addBreadcrumb = options.addBreadcrumb;
    this.ignoredUrls = options.ignoredUrls ?? [];
  }

  start(): void {
    if (this.originalFetch) {
      return;
    }

    this.originalFetch = window.fetch;
    const originalFetch = this.originalFetch;

    window.fetch = async (...args) => {
      const startedAt = performance.now();
      const requestInfo = args[0];
      const requestInit = args[1];

      const url = this.getRequestUrl(requestInfo);

      if (this.shouldIgnoreUrl(url)) {
        return originalFetch(...args);
      }

      try {
        const response = await originalFetch(...args);
        const duration = Math.round(performance.now() - startedAt);

        this.addBreadcrumb({
          type: "http",
          message: `${requestInit?.method ?? "GET"} ${url} ${response.status}`,
          metadata: {
            url,
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
          message: `${requestInit?.method ?? "GET"} ${url} failed`,
          metadata: {
            url,
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
}
