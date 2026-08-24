import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlayerInfo, PlayerType } from "../../../src/core/game/Game";
import { GameMapImpl } from "../../../src/core/game/GameMap";
import { setup } from "../../util/Setup";
import { UseRealAttackLogic } from "../../util/TestConfig";

describe("packed tile devastation", () => {
  it("stores four levels without changing ownership, fallout, or defense", () => {
    const terrain = new Uint8Array(4).fill(0x81);
    const map = new GameMapImpl(2, 2, terrain, 4);
    map.setOwnerID(0, 7);
    map.setFallout(0, true);
    map.setDefenseBonus(0, true);

    for (let level = 0; level <= 3; level++) {
      map.setDevastation(0, level);
      expect(map.devastation(0)).toBe(level);
      expect(map.ownerID(0)).toBe(7);
      expect(map.hasFallout(0)).toBe(true);
      expect(map.hasDefenseBonus(0)).toBe(true);
    }

    map.setDevastation(0, 99);
    expect(map.devastation(0)).toBe(3);
    map.setDevastation(0, -10);
    expect(map.devastation(0)).toBe(0);
  });

  it("survives packed multiplayer tile updates and clears on water", () => {
    const terrain = new Uint8Array(2).fill(0x81);
    const source = new GameMapImpl(2, 1, terrain.slice(), 2);
    const target = new GameMapImpl(2, 1, terrain.slice(), 2);
    source.setDevastation(0, 3);

    target.updateTile(0, source.tileState(0) | (source.terrainByte(0) << 16));
    expect(target.devastation(0)).toBe(3);

    target.setWater(0);
    expect(target.devastation(0)).toBe(0);
  });
});

describe("local devastation capture resistance", () => {
  it("makes the exact blackened tile cost more troops and capture time", async () => {
    const game = await setup(
      "plains",
      {},
      [new PlayerInfo("attacker", PlayerType.Human, null, "attacker")],
      undefined,
      UseRealAttackLogic,
    );
    const attacker = game.player("attacker");
    const tile = game.ref(4, 4);

    const clean = game
      .config()
      .attackLogic(game, 10_000, attacker, game.terraNullius(), tile);
    game.setDevastation(tile, 3);
    const blackened = game
      .config()
      .attackLogic(game, 10_000, attacker, game.terraNullius(), tile);

    expect(blackened.attackerTroopLoss).toBeGreaterThan(
      clean.attackerTroopLoss,
    );
    expect(blackened.tilesPerTickUsed).toBeGreaterThan(clean.tilesPerTickUsed);
    expect(game.config().devastationDefenseModifier(0)).toBe(1);
    expect(game.config().devastationDefenseModifier(3)).toBeGreaterThan(2);
  });
});

describe("2D devastation rendering", () => {
  it("decodes all levels and approaches black at maximum damage", () => {
    const shader = readFileSync(
      "src/client/render/gl/shaders/map-overlay/territory.frag.glsl",
      "utf8",
    );
    expect(shader).toContain("DEVASTATION_LOW_BIT");
    expect(shader).toContain("DEVASTATION_HIGH_BIT");
    expect(shader).toContain(
      "float devastationRatio = float(devastation) / 3.0;",
    );
    expect(shader).toContain("devastationRatio * 0.90");
    expect(shader).toContain("devastationRatio * 0.88");
  });
});
