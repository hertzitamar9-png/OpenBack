import { render, type TemplateResult } from "lit";
import { describe, expect, it } from "vitest";
import { HelpModal } from "../../src/client/HelpModal";

describe("Help modal section icons", () => {
  it("renders the assault-units gear in the same vector style as its neighbours", () => {
    const modal = new HelpModal();
    const body = (
      modal as unknown as { renderBody(): TemplateResult }
    ).renderBody();
    const host = document.createElement("div");
    render(body, host);

    const icon = host.querySelector(
      '[data-help-section-icon="openback-units"] [data-interface-icon="gear"]',
    );
    expect(icon).not.toBeNull();
    const wrapper = icon?.closest("[data-help-section-icon]");
    expect(wrapper?.className).toContain("text-blue-400");
    expect(wrapper?.className).not.toContain("drop-shadow");
    expect(icon?.getAttribute("class")).toContain("w-6 h-6");
    expect(icon?.getAttribute("stroke-width")).toBe("2");
    expect(host.textContent).not.toContain("⚙");
  });
});
