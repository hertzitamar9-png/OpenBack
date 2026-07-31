import { describe, expect, it } from "vitest";
import { GameMapImpl } from "../../../src/core/game/GameMap";

describe("GameMap.isValidRef", () => {
  const map = new GameMapImpl(10, 8, new Uint8Array(80), 0);

  it("accepts integer refs within range", () => {
    expect(map.isValidRef(0)).toBe(true);
    expect(map.isValidRef(79)).toBe(true);
  });

  it("rejects out-of-range and non-integer refs", () => {
    expect(map.isValidRef(-1)).toBe(false);
    expect(map.isValidRef(80)).toBe(false);
    expect(map.isValidRef(1.5)).toBe(false);
    expect(map.isValidRef(NaN)).toBe(false);
    expect(map.isValidRef(Infinity)).toBe(false);
  });
});
