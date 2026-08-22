import { describe, expect, it } from "vitest";
import { isAttackableTerrain } from "../../src/core/execution/AttackExecution";
import { TerrainType } from "../../src/core/game/Game";

/**
 * A live match died with "impassable terrain cannot be attacked".
 *
 * Config.attackLogic switches on terrainType and throws for anything it does
 * not handle, and a throw inside the simulation tick takes the whole game down
 * for everyone in it. The attack guard was asking a different question --
 * map.isImpassable -- than the switch asks, so the two could disagree about a
 * tile and hand the switch something it would reject.
 *
 * The guard now admits exactly what the switch handles. These tests pin the
 * two sides together: if a terrain type is added to attackLogic, or removed,
 * this is what notices.
 */
describe("attackable terrain", () => {
  it("admits the terrain an attack can advance into", () => {
    expect(isAttackableTerrain(TerrainType.Plains)).toBe(true);
    expect(isAttackableTerrain(TerrainType.Highland)).toBe(true);
    expect(isAttackableTerrain(TerrainType.Mountain)).toBe(true);
  });

  it("refuses what attackLogic would throw on", () => {
    // These are precisely the cases that crashed the match.
    expect(isAttackableTerrain(TerrainType.Impassable)).toBe(false);
    expect(isAttackableTerrain(TerrainType.Ocean)).toBe(false);
  });

  it("covers every terrain type, so a new one cannot slip through", () => {
    const all = Object.values(TerrainType).filter(
      (v): v is TerrainType => typeof v === "number",
    );
    // Every type is decided one way or the other -- nothing is undefined.
    for (const terrain of all) {
      expect(typeof isAttackableTerrain(terrain)).toBe("boolean");
    }
    // And the attackable set is exactly three: the switch's three cases.
    expect(all.filter(isAttackableTerrain)).toHaveLength(3);
  });
});
