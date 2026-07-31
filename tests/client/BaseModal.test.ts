import { html, TemplateResult } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import { BaseModal } from "../../src/client/components/BaseModal";

class LazyBodyTestModal extends BaseModal {
  bodyRenderCount = 0;
  headerRenderCount = 0;

  protected renderHeaderSlot(): TemplateResult {
    this.headerRenderCount++;
    return html`<span data-testid="header">Header</span>`;
  }

  protected renderBody(): TemplateResult {
    this.bodyRenderCount++;
    return html`<span data-testid="body">Body</span>`;
  }
}

if (!customElements.get("lazy-body-test-modal")) {
  customElements.define("lazy-body-test-modal", LazyBodyTestModal);
}

describe("BaseModal lazy rendering", () => {
  let modal: LazyBodyTestModal | undefined;

  afterEach(() => {
    modal?.remove();
    modal = undefined;
  });

  it("defers modal content until opened", async () => {
    modal = document.createElement("lazy-body-test-modal") as LazyBodyTestModal;
    document.body.appendChild(modal);
    await modal.updateComplete;

    expect(modal.bodyRenderCount).toBe(0);
    expect(modal.querySelector('[data-testid="body"]')).toBeNull();

    modal.open();
    await modal.updateComplete;

    expect(modal.bodyRenderCount).toBe(1);
    expect(modal.headerRenderCount).toBe(1);
    expect(modal.querySelector('[data-testid="body"]')).not.toBeNull();
  });

  it("always renders inline page content", async () => {
    modal = document.createElement("lazy-body-test-modal") as LazyBodyTestModal;
    modal.setAttribute("inline", "");
    document.body.appendChild(modal);
    await modal.updateComplete;

    expect(modal.bodyRenderCount).toBe(1);
    expect(modal.querySelector('[data-testid="body"]')).not.toBeNull();
  });
});
