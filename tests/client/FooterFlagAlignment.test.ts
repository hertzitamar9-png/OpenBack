import { afterEach, describe, expect, it } from "vitest";
import { Footer } from "../../src/client/components/Footer";

describe("footer language flag alignment", () => {
  afterEach(() => document.body.replaceChildren());

  it("centers the desktop flag inside the original icon bar", async () => {
    const footer = new Footer();
    document.body.appendChild(footer);
    await footer.updateComplete;

    const iconLayer = footer.querySelector("footer > div:first-child")!;
    const language = footer.querySelector("lang-selector")!;

    const iconLinks = [...iconLayer.querySelectorAll("a")];

    expect(iconLayer.classList.contains("lg:absolute")).toBe(false);
    expect(iconLayer.classList.contains("lg:inset-0")).toBe(false);
    expect(iconLayer.classList.contains("lg:pt-2")).toBe(true);
    expect(
      iconLinks.every(
        (link) => !link.classList.contains("lg:pointer-events-auto"),
      ),
    ).toBe(true);
    expect(language.classList.contains("lg:top-[calc(50%+0.25rem)]")).toBe(
      true,
    );
    expect(language.classList.contains("lg:top-1/2")).toBe(false);
    expect(language.classList.contains("lg:-translate-y-1/2")).toBe(true);
    expect(language.classList.contains("lg:top-0")).toBe(false);
  });
});
