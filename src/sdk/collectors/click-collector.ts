import type { Collector } from "../types/collector.js";
import type { Breadcrumb } from "../types/events.js";

type ClickCollectorOptions = {
  addBreadcrumb: (breadcrumb: Omit<Breadcrumb, "id" | "timestamp">) => void;
  captureText?: boolean;
};

export class ClickCollector implements Collector {
  private readonly addBreadcrumb: ClickCollectorOptions["addBreadcrumb"];
  private readonly captureText: boolean;

  constructor(options: ClickCollectorOptions) {
    this.addBreadcrumb = options.addBreadcrumb;
    this.captureText = options.captureText ?? false;
  }

  start(): void {
    document.addEventListener("click", this.handleClick, true);
  }

  stop(): void {
    document.removeEventListener("click", this.handleClick, true);
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    this.addBreadcrumb({
      type: "click",
      message: this.getElementLabel(target),
      metadata: {
        tagName: target.tagName.toLowerCase(),
      },
    });
  };

  private getElementLabel(element: HTMLElement): string {
    if (!this.captureText) {
      return element.tagName.toLowerCase();
    }

    const text = element.innerText.trim();

    if (text) {
      return text.slice(0, 80);
    }

    return element.tagName.toLowerCase();
  }
}
