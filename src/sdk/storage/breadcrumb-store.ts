import type { Breadcrumb } from "@sdk-types/events";

const DEFAULT_MAX_BREADCRUMBS = 20;

export class BreadcrumbStore {
  private readonly maxBreadcrumbs: number;
  private breadcrumbs: Breadcrumb[] = [];

  constructor(maxBreadcrumbs = DEFAULT_MAX_BREADCRUMBS) {
    this.maxBreadcrumbs = maxBreadcrumbs;
  }

  add(breadcrumb: Omit<Breadcrumb, "id" | "timestamp">): void {
    const nextBreadcrumb: Breadcrumb = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...breadcrumb,
    };

    this.breadcrumbs = [nextBreadcrumb, ...this.breadcrumbs].slice(0, this.maxBreadcrumbs);
  }

  getAll(): Breadcrumb[] {
    return this.breadcrumbs;
  }

  clear(): void {
    this.breadcrumbs = [];
  }
}
