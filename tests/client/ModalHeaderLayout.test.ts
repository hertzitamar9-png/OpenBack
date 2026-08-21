import { html, render } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import { modalHeader } from "../../src/client/components/ui/ModalHeader";

function mount(props: Parameters<typeof modalHeader>[0]): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  render(modalHeader(props), host);
  return host;
}

describe("modal header layout", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  // The host-lobby header puts two ~220px copy chips beside the title. With a
  // freely-shrinking title column those chips claimed the whole row and
  // squeezed the heading to roughly one character wide, so it rendered one
  // letter per line down the side of the modal on a phone.
  it("keeps a floor under the back button and title", () => {
    const host = mount({ title: "Private Lobby", onBack: () => {} });
    const left = host.querySelector("[data-modal-back]")?.parentElement;

    expect(left).toBeTruthy();
    expect(left!.className).toContain("min-w-[10rem]");
    expect(left!.className).not.toContain("min-w-0");
    // The row still wraps, so right-hand content moves to its own line rather
    // than overflowing once it no longer fits beside the title.
    expect(left!.parentElement!.className).toContain("flex-wrap");
  });

  it("still renders right-hand content", () => {
    const host = mount({
      title: "Private Lobby",
      onBack: () => {},
      rightContent: html`<span data-chip>ABC123</span>`,
    });

    expect(host.querySelector("[data-chip]")?.textContent).toBe("ABC123");
    expect(host.querySelector("[data-modal-back]")).toBeTruthy();
  });
});
