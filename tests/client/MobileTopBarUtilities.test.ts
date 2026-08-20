import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/CrazyGamesSDK", () => ({
  crazyGamesSDK: { isOnCrazyGames: () => false },
}));
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

import { MobileTopBar } from "../../src/client/components/MobileTopBar";

describe("mobile top bar utilities", () => {
  it("renders the shared News, Settings, and Help icon cluster", async () => {
    const topBar = new MobileTopBar();
    document.body.appendChild(topBar);
    await topBar.updateComplete;

    const utilities = topBar.querySelector("nav-utility-icons");
    expect(utilities).not.toBeNull();
    expect(utilities?.getAttribute("size")).toBe("mobile");
    topBar.remove();
  });
});
