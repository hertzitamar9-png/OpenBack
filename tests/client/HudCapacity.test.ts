import { describe, expect, test } from "vitest";
import {
  bottomHudLayout,
  playerInfoCounterLayout,
} from "../../src/client/hud/layout/HudCapacity";

describe("bottomHudLayout", () => {
  // Portrait columns are chosen to fit a readable 44px button rather than from
  // fixed widths. That trades a little button width for fewer rows, which is
  // what a phone needs: the bar sits at the bottom, where Android slides its
  // navigation over the page, so height is the scarce dimension. 320px now
  // gets 6 columns of 53px over 3 rows instead of 4 columns of 80px over 4,
  // and 53px is wider than the 49px this table already accepts at 393px.
  test.each([
    [320, 568, 6, 3],
    [360, 800, 6, 3],
    [393, 852, 8, 2],
    [430, 932, 8, 2],
    [568, 320, 16, 1],
    [667, 375, 16, 1],
    [740, 360, 16, 1],
    [852, 393, 16, 1],
  ])(
    "%ix%i chooses %i columns and %i rows without clipping",
    (width, height, columns, rows) => {
      expect(
        bottomHudLayout({
          width,
          height,
          safeLeft: 12,
          safeRight: 12,
          units: 16,
        }),
      ).toMatchObject({ columns, rows });
    },
  );

  test("curved-screen insets reduce usable width before selecting columns", () => {
    expect(
      bottomHudLayout({
        width: 393,
        height: 852,
        safeLeft: 30,
        safeRight: 30,
        units: 16,
      }),
    ).toMatchObject({ columns: 6, rows: 3, usableWidth: 333 });
  });

  test("narrow landscape keeps one row and falls back to icons", () => {
    expect(
      bottomHudLayout({
        width: 568,
        height: 320,
        safeLeft: 20,
        safeRight: 20,
        units: 16,
      }),
    ).toMatchObject({ columns: 16, rows: 1, labelMode: "icon" });
  });
});

describe("playerInfoCounterLayout", () => {
  test("uses one evenly spaced row when global controls also fit", () => {
    expect(playerInfoCounterLayout(12, 980, 300)).toMatchObject({
      columns: 12,
      rows: 1,
    });
  });

  test("uses two balanced rows before covering global controls", () => {
    const layout = playerInfoCounterLayout(12, 568, 250);
    expect(layout).toMatchObject({ columns: 6, rows: 2 });
    expect(
      layout.items.slice(0, 6).filter((item) => item !== null),
    ).toHaveLength(6);
    expect(layout.items.slice(6).filter((item) => item !== null)).toHaveLength(
      6,
    );
  });

  test("pads an odd unit count symmetrically in two-row mode", () => {
    const layout = playerInfoCounterLayout(11, 500, 250);
    expect(layout).toMatchObject({ columns: 6, rows: 2 });
    expect(layout.items).toHaveLength(12);
    expect(layout.items[11]).toBeNull();
  });
});
