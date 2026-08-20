import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  it("loads the mobile top bar from the production entry point", () => {
    const main = readFileSync(
      resolve(process.cwd(), "src/client/Main.ts"),
      "utf8",
    );
    expect(main).toContain('import "./components/MobileTopBar";');
  });

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
