import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/CrazyGamesSDK", () => ({
  crazyGamesSDK: { isOnCrazyGames: () => false },
}));
vi.mock("../../src/client/components/NavNotificationsController", () => ({
  NavNotificationsController: class {
    constructor(host: { addController(controller: unknown): void }) {
      host.addController(this);
    }
    showStoreDot() {
      return false;
    }
    showNewsDot() {
      return false;
    }
    showHelpDot() {
      return false;
    }
    onStoreClick() {}
    onNewsClick() {}
    onHelpClick() {}
  },
}));
vi.mock("../../src/client/SocialAttention", () => ({
  socialAttention: { getStage: () => "none" },
}));

import { DesktopNavBar } from "../../src/client/components/DesktopNavBar";
import { MobileNavBar } from "../../src/client/components/MobileNavBar";
import { MobileTopBar } from "../../src/client/components/MobileTopBar";

describe("OpenBack header wordmark navigation", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.showPage = undefined;
    window.currentPageId = undefined;
  });

  for (const [name, create] of [
    ["desktop", () => new DesktopNavBar()],
    ["mobile top bar", () => new MobileTopBar()],
    ["mobile menu", () => new MobileNavBar()],
  ] as const) {
    it(`makes only the ${name} OPENBACK text return home`, async () => {
      const showPage = vi.fn();
      window.showPage = showPage;
      window.currentPageId = "page-help";
      const navigation = create();
      document.body.appendChild(navigation);
      await navigation.updateComplete;

      const control = navigation.querySelector<HTMLButtonElement>(
        "[data-openback-wordmark-home]",
      );
      expect(control).not.toBeNull();
      expect(control?.dataset.wordmarkStart).toBe("20.8%");
      expect(navigation.querySelector("img")?.closest("button")).toBeNull();

      control?.click();
      expect(showPage).toHaveBeenCalledWith("page-play");
    });
  }
});
