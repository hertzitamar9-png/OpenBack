import { describe, expect, it } from "vitest";
import { WarTableEffectPool } from "../../../../src/client/render/gl/war-table/WarTableEffectPool";

describe("Living War Table effect pool", () => {
  it("expires effects and clears every slot", () => {
    const pool = new WarTableEffectPool(4);
    pool.spawn({
      family: "tank-destruction",
      x: 2,
      y: 3,
      startMs: 0,
      lifetimeMs: 500,
    });
    expect(pool.activeCount).toBe(1);
    pool.update(499);
    expect(pool.activeCount).toBe(1);
    pool.update(500);
    expect(pool.activeCount).toBe(0);
    pool.spawn({ family: "impact", x: 1, y: 1, startMs: 600, lifetimeMs: 50 });
    pool.clear();
    expect(pool.activeCount).toBe(0);
  });

  it("reuses the oldest decorative slot and never stores invalid effects", () => {
    const pool = new WarTableEffectPool(2);
    pool.spawn({
      family: "train-smoke",
      x: 1,
      y: 1,
      startMs: 0,
      lifetimeMs: 100,
    });
    pool.spawn({
      family: "aircraft-smoke",
      x: 2,
      y: 2,
      startMs: 1,
      lifetimeMs: 100,
    });
    pool.spawn({
      family: "train-smoke",
      x: 3,
      y: 3,
      startMs: 2,
      lifetimeMs: 100,
    });
    expect(pool.activeCount).toBe(2);
    expect(pool.snapshot().map((effect) => effect.x)).toEqual([3, 2]);
    expect(
      pool.spawn({
        family: "impact",
        x: Number.NaN,
        y: 0,
        startMs: 0,
        lifetimeMs: 1,
      }),
    ).toBe(false);
  });

  it("suppresses decorative debris in reduced motion", () => {
    const pool = new WarTableEffectPool(3, true);
    expect(
      pool.spawn({
        family: "debris",
        x: 0,
        y: 0,
        startMs: 0,
        lifetimeMs: 20,
        decorative: true,
      }),
    ).toBe(false);
    expect(
      pool.spawn({ family: "impact", x: 0, y: 0, startMs: 0, lifetimeMs: 20 }),
    ).toBe(true);
  });
});
