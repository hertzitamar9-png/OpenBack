import { describe, expect, it } from "vitest";
import {
  buildAnimation,
  deletionAnimation,
  structureInstanceFor,
} from "../../../../src/client/render/gl/war-table/WarTableAnimationState";
import { UT_CITY, UT_RUNWAY } from "../../../../src/client/render/types";

describe("Living War Table structure instances", () => {
  it("derives finite registry-backed instance values", () => {
    expect(
      structureInstanceFor({
        unitType: UT_RUNWAY,
        x: 17,
        y: 9,
        ownerID: 4,
        constructionStartTick: 100,
        constructionDuration: 40,
        markedForDeletion: false,
        tick: 120,
      }),
    ).toEqual({
      x: 17,
      y: 9,
      ownerID: 4,
      atlasColumn: 6,
      assembly: 0.5,
      deletion: 0,
      scale: 1.2,
      groundOffset: 0,
    });
  });

  it("keeps completed distant structures as nonzero silhouettes", () => {
    const instance = structureInstanceFor({
      unitType: UT_CITY,
      x: 2,
      y: 3,
      ownerID: 1,
      constructionStartTick: null,
      constructionDuration: 50,
      markedForDeletion: false,
      tick: 500,
    });
    expect(instance.assembly).toBe(1);
    expect(instance.scale).toBeGreaterThan(0);
    expect(Object.values(instance).every(Number.isFinite)).toBe(true);
  });
});

describe("Living War Table structure animation", () => {
  it("maps canonical build ticks into bounded assembly and settle phases", () => {
    expect(buildAnimation(null, 100, 30)).toEqual({
      assembly: 1,
      settle: 1,
    });
    expect(buildAnimation(100, 100, 40)).toEqual({
      assembly: 0,
      settle: 0,
    });
    expect(buildAnimation(100, 120, 40)).toEqual({
      assembly: 0.5,
      settle: 0,
    });
    expect(buildAnimation(100, 140, 40)).toEqual({
      assembly: 1,
      settle: 1,
    });
  });

  it("keeps deletion deterministic and bounded", () => {
    expect(deletionAnimation(false)).toBe(0);
    expect(deletionAnimation(true)).toBe(1);
  });
});
