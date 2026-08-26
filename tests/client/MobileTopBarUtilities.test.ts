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

  it("keeps the largest fitting wordmark in the main subpage row", async () => {
    const topBar = new MobileTopBar();
    document.body.appendChild(topBar);
    window.dispatchEvent(new CustomEvent("showPage", { detail: "page-help" }));
    await topBar.updateComplete;

    expect(
      topBar.querySelector(".mobile-top-bar-layout-subpage"),
    ).not.toBeNull();
    const styles = readFileSync(
      resolve(process.cwd(), "src/client/styles/openback.css"),
      "utf8",
    );
    expect(topBar.innerHTML).toContain("max-w-[8.5rem]");
    expect(styles).toContain(".mobile-top-bar-layout-subpage #mobile-back-btn");
    expect(styles).not.toContain("height: 5rem !important");
  });
});

// Signing in widens the trailing group (avatar + chevron join the three
// utility icons). With a fixed centre track and equal flexible side tracks,
// that group is wider than its track and overflows leftwards over the
// wordmark — measured at 67px of overlap on a 375px-wide phone, which is what
// put the notification bell on top of the logo. Content-sized side columns
// with a flexible middle cannot collide however wide the groups grow.
describe("mobile top bar layout", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("sizes the side columns to their content and flexes the wordmark", async () => {
    const topBar = new MobileTopBar();
    document.body.appendChild(topBar);
    await topBar.updateComplete;

    const grid = topBar.querySelector<HTMLElement>(".grid");
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain("grid-cols-[auto_minmax(0,1fr)_auto]");
    // A fixed centre track is what let the groups overlap.
    expect(grid!.className).not.toContain(
      "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
    );

    const middle = grid!.querySelector<HTMLElement>(".col-start-2");
    expect(middle).not.toBeNull();
    // The wordmark scales down inside its cell rather than pushing outwards.
    expect(middle!.className).toContain("min-w-0");
    expect(middle!.className).toContain("overflow-hidden");
    const logo = middle!.querySelector("img");
    expect(logo).not.toBeNull();
    expect(logo!.className).toContain("object-contain");
  });
});
