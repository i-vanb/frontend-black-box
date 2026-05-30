import { describe, expect, it } from "vitest";

import { BreadcrumbStore } from "./breadcrumb-store";

describe("BreadcrumbStore", () => {
  it("adds breadcrumbs", () => {
    const store = new BreadcrumbStore();

    store.add({
      type: "manual",
      message: "Test breadcrumb",
    });

    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0]?.message).toBe("Test breadcrumb");
  });

  it("limits breadcrumbs by max size", () => {
    const store = new BreadcrumbStore(2);

    store.add({ type: "manual", message: "First" });
    store.add({ type: "manual", message: "Second" });
    store.add({ type: "manual", message: "Third" });

    expect(store.getAll()).toHaveLength(2);
    expect(store.getAll()[0]?.message).toBe("Third");
    expect(store.getAll()[1]?.message).toBe("Second");
  });

  it("clears breadcrumbs", () => {
    const store = new BreadcrumbStore();

    store.add({
      type: "manual",
      message: "Test breadcrumb",
    });

    store.clear();

    expect(store.getAll()).toEqual([]);
  });
});
