import { afterEach, describe, expect, it } from "vitest";
import { Footer } from "../../src/client/components/Footer";

describe("footer language flag alignment", () => {
  afterEach(() => document.body.replaceChildren());

  it("centers the desktop flag against the complete footer height", async () => {
    const footer = new Footer();
    document.body.appendChild(footer);
    await footer.updateComplete;

    const iconLayer = footer.querySelector("footer > div:first-child")!;
    const language = footer.querySelector("lang-selector")!;

    expect(iconLayer.classList.contains("lg:absolute")).toBe(true);
    expect(iconLayer.classList.contains("lg:inset-0")).toBe(true);
    expect(language.classList.contains("lg:top-1/2")).toBe(true);
    expect(language.classList.contains("lg:-translate-y-1/2")).toBe(true);
    expect(language.classList.contains("lg:top-0")).toBe(false);
  });
});
