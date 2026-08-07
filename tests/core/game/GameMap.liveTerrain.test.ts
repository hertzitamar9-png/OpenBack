import { describe, expect, it } from "vitest";
import { GameMapImpl } from "../../../src/core/game/GameMap";

describe("GameMap live terrain", () => {
  it("changes land count when water freezes and when it thaws", () => {
    const terrain = new Uint8Array([0, 0x81, 0, 0x81]);
    const map = new GameMapImpl(2, 2, terrain, 2);
    map.setTerrainByte(0, 0x81);
    expect(map.isLand(0)).toBe(true);
    expect(map.numLandTiles()).toBe(3);
    map.setTerrainByte(0, 0);
    expect(map.isWater(0)).toBe(true);
    expect(map.numLandTiles()).toBe(2);
  });

  it("supports permanent impassable volcanic terrain", () => {
    const map = new GameMapImpl(2, 2, new Uint8Array(4).fill(0x81), 4);
    map.setTerrainByte(2, 0x9f);
    expect(map.isLand(2)).toBe(true);
    expect(map.isImpassable(2)).toBe(true);
    expect(map.terrainByte(2)).toBe(0x9f);
  });
});
