import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/components/NavNotificationsController", () => ({
  NavNotificationsController: class {
    constructor(host: { addController(controller: unknown): void }) {
      host.addController(this);
    }
    showNewsDot() {
      return false;
    }
    showHelpDot() {
      return false;
    }
    onNewsClick() {}
    onHelpClick() {}
  },
}));

import { appRouter } from "../../src/client/AppRouter";
import { NavUtilityIcons } from "../../src/client/components/NavUtilityIcons";

describe("nav utility icons", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    appRouter.reset();
    history.replaceState(null, "", "/");
    window.showPage = undefined;
  });

  it("places a white settings gear between matching News and Help icons", async () => {
    const showPage = vi.fn();
    window.showPage = showPage;
    history.replaceState(null, "", "/news");
    const icons = new NavUtilityIcons();
    document.body.appendChild(icons);
    await icons.updateComplete;

    expect(
      Array.from(icons.querySelectorAll<HTMLButtonElement>("button")).map(
        (button) => button.dataset.page,
      ),
    ).toEqual(["page-news", "page-settings", "page-help"]);

    const settings = icons.querySelector<HTMLButtonElement>(
      '[data-page="page-settings"]',
    )!;
    for (const button of icons.querySelectorAll<HTMLButtonElement>("button")) {
      expect(button.className).toContain("text-white/70");
      expect(button.className).not.toContain("!text-malibu-blue");
      expect(button.className).toContain("focus-visible:outline-white");
    }
    expect(
      settings.querySelector('[data-interface-icon="gear"]'),
    ).not.toBeNull();
    expect(
      settings
        .querySelector('[data-interface-icon="gear"]')
        ?.getAttribute("stroke-width"),
    ).toBe("1.8");
    expect(settings.className).not.toContain("drop-shadow");

    settings.click();
    expect(location.pathname).toBe("/");
    expect(showPage).toHaveBeenCalledWith("page-settings", { tab: "basic" });
  });
});
