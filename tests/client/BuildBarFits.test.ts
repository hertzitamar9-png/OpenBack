import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bottomHudLayout } from "../../src/client/hud/layout/HudCapacity";

/**
 * The build bar has to fit the screen the player can actually see.
 *
 * Android hides its navigation bar for a fullscreen game and slides it back
 * over the page on a swipe. window.innerHeight does not change when that
 * happens, so the bar was laid out for a taller screen than was visible and
 * its bottom row sat under the buttons. The visual viewport reports the part
 * actually visible, and it does fire on the change.
 *
 * Columns are also chosen by what fits rather than from fixed widths, so a
 * wider phone fills its row instead of stopping where a narrow one does.
 */
const display = readFileSync("src/client/hud/layers/UnitDisplay.ts", "utf8");
const MIN_ITEM = 44;
const layout = (width: number, height = 900, units = 16) =>
  bottomHudLayout({ width, height, safeLeft: 0, safeRight: 0, units });

describe("build bar layout", () => {
  it.each([
    [320, "a small phone"],
    [360, "a common phone"],
    [390, "an iPhone"],
    [412, "a large Android"],
    [280, "a very narrow screen"],
  ])("never makes an item narrower than is readable at %ipx (%s)", (width) => {
    const { columns, usableWidth } = layout(width);
    expect(usableWidth / columns).toBeGreaterThanOrEqual(MIN_ITEM);
  });

  it("uses the width it has rather than stopping at a fixed step", () => {
    // 8 columns as soon as 8 readable items fit, not at an arbitrary 360.
    expect(layout(MIN_ITEM * 8).columns).toBe(8);
    expect(layout(MIN_ITEM * 8 - 1).columns).toBe(6);
  });

  it("drops columns rather than overflowing when there is no room", () => {
    expect(layout(200).columns).toBe(4);
    expect(layout(200).usableWidth / layout(200).columns).toBeGreaterThan(0);
  });

  it("keeps every unit reachable by adding rows, never by hiding one", () => {
    for (const width of [280, 320, 360, 412]) {
      const { columns, rows } = layout(width);
      expect(columns * rows).toBeGreaterThanOrEqual(16);
    }
  });

  it("subtracts the safe-area padding from the space it lays out", () => {
    const inset = bottomHudLayout({
      width: 412,
      height: 900,
      safeLeft: 24,
      safeRight: 24,
      units: 16,
    });
    expect(inset.usableWidth).toBe(412 - 48);
  });

  it("relayouts when the visible viewport changes, not just the window", () => {
    expect(display).toMatch(
      /window\.visualViewport\?\.addEventListener\("resize"/,
    );
    expect(display).toMatch(
      /window\.visualViewport\?\.removeEventListener\("resize"/,
    );
    expect(display).toMatch(
      /height: viewport\?\.height \?\? window\.innerHeight/,
    );
  });
});
