import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesktopNavBar } from "../../src/client/components/DesktopNavBar";
import { MobileNavBar } from "../../src/client/components/MobileNavBar";

async function mount(element: DesktopNavBar | MobileNavBar) {
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

describe("player tutorial entry points", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("keeps Tutorial in the desktop and mobile navigation", async () => {
    const desktop = await mount(new DesktopNavBar());
    const mobile = await mount(new MobileNavBar());

    expect(
      desktop.querySelector('[data-tutorial-entry="desktop-nav"]'),
    ).toBeTruthy();
    expect(
      mobile.querySelector('[data-tutorial-entry="mobile-nav"]'),
    ).toBeTruthy();
  });

  it("opens the tutorial from the navigation without changing pages", async () => {
    const listener = vi.fn();
    document.addEventListener("open-player-tutorial", listener);
    const desktop = await mount(new DesktopNavBar());

    desktop
      .querySelector<HTMLButtonElement>('[data-tutorial-entry="desktop-nav"]')!
      .click();

    expect(listener).toHaveBeenCalledOnce();
    document.removeEventListener("open-player-tutorial", listener);
  });

  it("mounts one global tutorial and exposes it in the in-game controls", () => {
    const index = fs.readFileSync(
      path.join(process.cwd(), "index.html"),
      "utf8",
    );
    const main = fs.readFileSync(
      path.join(process.cwd(), "src/client/Main.ts"),
      "utf8",
    );
    const gameSidebar = fs.readFileSync(
      path.join(process.cwd(), "src/client/hud/layers/GameRightSidebar.ts"),
      "utf8",
    );

    expect(index.match(/<player-tutorial/g)).toHaveLength(1);
    expect(main).toContain('import "./components/PlayerTutorial"');
    expect(gameSidebar).toContain('data-tutorial-entry="in-game"');
    expect(gameSidebar).toContain('new CustomEvent("open-player-tutorial"');
  });
});
