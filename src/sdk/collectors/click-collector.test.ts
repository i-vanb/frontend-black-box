import type { Breadcrumb } from "@sdk-types/events";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      message: "Save changes",
      metadata: {
        tagName: "button",
      },
    });

    collector.stop();
  });
});
