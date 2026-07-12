import fs from "fs";
import { globSync } from "glob";
import { afterEach, describe, expect, it } from "vitest";
import { BaseModal } from "../../../src/client/components/BaseModal";
import { OModal } from "../../../src/client/components/baseComponents/Modal";

class TestBaseModal extends BaseModal {}

if (!customElements.get("test-base-modal")) {
  customElements.define("test-base-modal", TestBaseModal);
}

describe("modal dismissal", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("does not close an overlay when its backdrop is clicked", async () => {
    const modal = new OModal();
    document.body.appendChild(modal);
    modal.open();
    await modal.updateComplete;

    modal.shadowRoot
      ?.querySelector("aside")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(modal.isModalOpen).toBe(true);
  });

  it("does not close a page modal when Escape is pressed", () => {
    const modal = document.createElement("test-base-modal") as TestBaseModal;
    modal.inline = true;
    document.body.appendChild(modal);
    modal.open();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(modal.isOpen()).toBe(true);
  });

  it("keeps every close or cancel click bound to an explicit button", () => {
    const files = globSync("src/client/**/*.ts", { nodir: true });
    const violations: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /@click=\$\{[^\n]*(?:close|cancel)[^\n]*/gi,
      )) {
        const before = source.slice(0, match.index);
        const tag = before.match(/<([\w-]+)[^<>]*$/)?.[1];
        if (tag !== "button" && tag !== "o-button") {
          violations.push(`${file}: <${tag ?? "unknown"}> ${match[0]}`);
        }
      }

      if (
        /handleOutsideClick|e\.target\s*===\s*e\.currentTarget/.test(source)
      ) {
        violations.push(`${file}: contains an outside-click dismissal`);
      }
    }

    expect(violations).toEqual([]);
  });
});
