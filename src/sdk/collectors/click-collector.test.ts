import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Breadcrumb } from "../types/events.js";
import { ClickCollector } from "./click-collector";

type AddBreadcrumb = (breadcrumb: Omit<Breadcrumb, "id" | "timestamp">) => void;

describe("ClickCollector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("adds click breadcrumb when user clicks element", () => {
    const addBreadcrumb = vi.fn<AddBreadcrumb>();

    const button = document.createElement("button");
    button.innerText = "Save changes";
    document.body.append(button);

    const collector = new ClickCollector({
      addBreadcrumb,
    });

    collector.start();

    button.click();

    expect(addBreadcrumb).toHaveBeenCalledWith({
      type: "click",
      message: "button",
      metadata: {
        tagName: "button",
      },
    });

    collector.stop();
  });

  it("captures element text only when explicitly enabled", () => {
    const addBreadcrumb = vi.fn<AddBreadcrumb>();
    const button = document.createElement("button");
    button.innerText = "Save changes";
    document.body.append(button);
    const collector = new ClickCollector({ addBreadcrumb, captureText: true });

    collector.start();
    button.click();

    expect(addBreadcrumb.mock.calls[0]?.[0].message).toBe("Save changes");
    collector.stop();
  });
});
