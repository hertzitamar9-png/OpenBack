import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => {
    document.body.replaceChildren();
    document.documentElement.classList.remove("overflow-hidden");
    window.currentPageId = "page-play";
  });

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

  it("keeps account access visible in the persistent mobile header", async () => {
    const topBar = new MobileTopBar();
    document.body.appendChild(topBar);
    await topBar.updateComplete;

    expect(
      topBar.querySelector('nav-account-menu[variant="mobile"]'),
    ).not.toBeNull();
  });

  it("opens the sidebar after a subpage rerenders the hamburger", async () => {
    const sidebar = document.createElement("div");
    sidebar.id = "sidebar-menu";
    const backdrop = document.createElement("div");
    backdrop.id = "mobile-menu-backdrop";
    const topBar = new MobileTopBar();
    document.body.append(sidebar, backdrop, topBar);
    await topBar.updateComplete;

    window.dispatchEvent(new CustomEvent("showPage", { detail: "page-help" }));
    await topBar.updateComplete;
    topBar.querySelector<HTMLButtonElement>("#hamburger-btn")!.click();

    expect(sidebar.classList).toContain("open");
    expect(backdrop.classList).toContain("open");
    expect(document.documentElement.classList).toContain("overflow-hidden");
  });
});
