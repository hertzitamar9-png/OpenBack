import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { balanceUnitCounterTypes } from "../../src/client/hud/layers/PlayerInfoOverlay";
import { UnitType } from "../../src/core/game/Game";

describe("mobile player unit counter balance", () => {
  it("reserves the global-controls width before choosing counter rows", () => {
    const source = readFileSync(
      "src/client/hud/layers/PlayerInfoOverlay.ts",
      "utf8",
    );
    expect(source).toContain("playerInfoCounterLayout");
    expect(source).toContain("game-right-sidebar");
    expect(source).toContain("--player-unit-rows");
    expect(source).toContain("--game-global-controls-width");
  });

  it("arranges all twelve counters as two equal rows of six", () => {
    const types = [
      UnitType.City,
      UnitType.Factory,
      UnitType.Port,
      UnitType.MissileSilo,
      UnitType.SAMLauncher,
      UnitType.Warship,
      UnitType.Plane,
      UnitType.Runway,
      UnitType.MANPAD,
      UnitType.MilitaryBase,
      UnitType.Tank,
      UnitType.TankMine,
    ];

    const balanced = balanceUnitCounterTypes(types);

    expect(balanced.columns).toBe(6);
    expect(balanced.items).toEqual(types);
  });

  it("pads an odd enabled count instead of leaving uneven rows", () => {
    const types = [
      UnitType.City,
      UnitType.Factory,
      UnitType.Port,
      UnitType.Warship,
      UnitType.Plane,
    ];

    expect(balanceUnitCounterTypes(types)).toEqual({
      columns: 3,
      items: [...types, null],
    });
  });
});
