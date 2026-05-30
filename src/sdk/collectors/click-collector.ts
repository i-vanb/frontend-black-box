import type { Collector } from "@sdk-types/collector";
import type { Breadcrumb } from "@sdk-types/events";

type ClickCollectorOptions = {
  addBreadcrumb: (breadcrumb: Omit<Breadcrumb, "id" | "timestamp">) => void;
};

export class ClickCollector implements Collector {
  private readonly addBreadcrumb: ClickCollectorOptions["addBreadcrumb"];

  constructor(options: ClickCollectorOptions) {
    this.addBreadcrumb = options.addBreadcrumb;
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
    const text = element.innerText.trim();

    if (text) {
      return text.slice(0, 80);
    }

    return element.tagName.toLowerCase();
  }
}
