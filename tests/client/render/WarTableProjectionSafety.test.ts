import { describe, expect, it } from "vitest";
import { WarTableEffectPool } from "../../../src/client/render/gl/war-table/WarTableEffectPool";

describe("Living War Table projection safety", () => {
  it("rejects non-finite effect uploads and clamps age", () => {
    const pool = new WarTableEffectPool(2);
    expect(
      pool.spawn({
        family: "impact",
        x: Infinity,
        y: 0,
        startMs: 0,
        lifetimeMs: 10,
      }),
    ).toBe(false);
    expect(
      pool.spawn({
        family: "impact",
        x: 0,
        y: 0,
        startMs: 0,
        lifetimeMs: 10,
        radius: NaN,
      }),
    ).toBe(false);
    pool.spawn({ family: "impact", x: 0, y: 0, startMs: 0, lifetimeMs: 10 });
    pool.update(9);
    expect(pool.snapshot()[0].age).toBeLessThanOrEqual(1);
  });
});
