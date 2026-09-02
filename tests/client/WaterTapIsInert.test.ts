import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Tapping open water must not open the radial menu.
 *
 * That menu carries the alliance and player actions, and a tap on the sea
 * raised it -- so brushing the water while panning threw it up. It belongs to
 * the long press, which raises its own ContextMenuEvent from InputHandler, and
 * the land branch in the same handler already said so.
 */
const controller = readFileSync(
  "src/client/controllers/WarshipSelectionController.ts",
  "utf8",
);

const onTouch = controller.slice(
  controller.indexOf("private onTouch(event: TouchEvent)"),
  controller.indexOf("Resolve a shift+drag selection box"),
);

describe("tapping the sea", () => {
  it("never opens the radial menu from a tap", () => {
    expect(onTouch).not.toContain("new ContextMenuEvent");
  });

  it("leaves the whole controller out of the tap-to-menu business", () => {
    // The long press path lives in InputHandler; nothing here should race it.
    expect(controller).not.toMatch(/emit\(new ContextMenuEvent/);
  });

  it("still selects a warship the tap landed near", () => {
    expect(onTouch).toMatch(/nearbyWarships\.length > 0/);
    expect(onTouch).toMatch(/this\.onMouseUp\(/);
  });

  it("still attacks when the tap was on somebody else's land", () => {
    expect(onTouch).toMatch(/if \(!isOwnLand\)/);
    expect(onTouch).toMatch(/new MouseUpEvent\(event\.x, event\.y\)/);
  });

  it("still places a spawn during the spawn phase", () => {
    expect(onTouch).toMatch(/inSpawnPhase\(\)/);
  });
});

/**
 * The in-game top bar spans the screen on a phone, as the build bar does.
 */
const sidebar = readFileSync(
  "src/client/hud/layers/GameRightSidebar.ts",
  "utf8",
);

describe("in-game top bar", () => {
  it("fills the width on a phone and spreads its buttons", () => {
    expect(sidebar).toMatch(/w-full justify-between/);
  });

  it("still hugs its contents on a desktop, where it is a corner panel", () => {
    expect(sidebar).toMatch(/min-\[1200px\]:w-fit/);
    expect(sidebar).toMatch(/min-\[1200px\]:justify-start/);
  });
});
