import { describe, expect, it } from "vitest";
import {
  THREE_D_WAVE_HEIGHT_SCALE,
  TIDAL_REACH_TILES,
  isFloodableLand,
  isTidalCoast,
  shipCurrentMultiplier,
  shipMovementSteps,
  shipStepsForRoute,
  threeDWorldCycle,
} from "../../../src/core/world/ThreeDWorldCycle";

describe("deterministic 3D world cycle", () => {
  it("derives repeatable bounded daylight, tide, waves, and current", () => {
    for (const tick of [0, 225, 450, 675, 900, 12_345]) {
      const a = threeDWorldCycle(tick);
      const b = threeDWorldCycle(tick);
      expect(a).toEqual(b);
      expect(a.daylight).toBeGreaterThanOrEqual(0.12);
      expect(a.daylight).toBeLessThanOrEqual(1);
      expect(Math.abs(a.tideHeight)).toBeLessThanOrEqual(0.72);
      expect(Math.hypot(a.currentX, a.currentY)).toBeCloseTo(1, 5);
    }
  });

  it("raises the night tide and changes ship speed with current direction", () => {
    const night = threeDWorldCycle(450);
    expect(night.isNight).toBe(true);
    expect(night.tideHeight).toBeGreaterThan(0);
    const aligned = shipCurrentMultiplier(
      night.currentX,
      night.currentY,
      night.currentX,
      night.currentY,
    );
    const opposed = shipCurrentMultiplier(
      -night.currentX,
      -night.currentY,
      night.currentX,
      night.currentY,
    );
    expect(aligned).toBeGreaterThan(1);
    expect(opposed).toBeLessThan(1);
  });

  it("keeps 3D wave crests visibly raised above the ocean plane", () => {
    const day = threeDWorldCycle(0);
    const night = threeDWorldCycle(450);
    // Crests must stand tall enough to read against the terrain beside them:
    // a magnitude-10 hill is about 5.4 world units, so sub-unit waves vanish.
    expect(THREE_D_WAVE_HEIGHT_SCALE).toBeGreaterThanOrEqual(1.5);
    // ...but never so tall they tower over real hills.
    expect(THREE_D_WAVE_HEIGHT_SCALE).toBeLessThan(4);
    expect(day.waveStrength * THREE_D_WAVE_HEIGHT_SCALE).toBeGreaterThan(1.2);
    expect(night.waveStrength * THREE_D_WAVE_HEIGHT_SCALE).toBeGreaterThan(2);
  });

  it("turns current alignment into deterministic zero, one, or two ship steps", () => {
    const fast = Array.from({ length: 40 }, (_, tick) =>
      shipMovementSteps(tick, 7, 1.28),
    );
    const slow = Array.from({ length: 40 }, (_, tick) =>
      shipMovementSteps(tick, 7, 0.72),
    );
    expect(fast.reduce<number>((a, b) => a + b, 0)).toBeGreaterThan(40);
    expect(slow.reduce<number>((a, b) => a + b, 0)).toBeLessThan(40);
    expect(fast.every((steps) => steps >= 1 && steps <= 2)).toBe(true);
    expect(slow.every((steps) => steps >= 0 && steps <= 1)).toBe(true);
  });

  it("only marks low ocean-facing land as temporary night tide terrain", () => {
    expect(isTidalCoast(0xc1, true)).toBe(true);
    expect(isTidalCoast(0xc3, true)).toBe(false);
    expect(isTidalCoast(0xc1, false)).toBe(false);
    expect(isTidalCoast(0x41, true)).toBe(false);
  });

  it("lets the tide climb inland over low ground, but not over high ground", () => {
    // Inland tiles are reached through flooded neighbours, so they must not be
    // required to touch the ocean the way the shoreline seeds are.
    expect(isFloodableLand(0xc1)).toBe(true); // low land, no ocean contact
    expect(isTidalCoast(0xc1, false)).toBe(false);

    // Height still stops it: the tide covers low ground only.
    expect(isFloodableLand(0xc3)).toBe(false);
    // Water is not land and is never "flooded" onto.
    expect(isFloodableLand(0x41)).toBe(false);
  });

  it("reaches inland far enough to take ground, without swallowing the map", () => {
    expect(TIDAL_REACH_TILES).toBeGreaterThan(0);
    expect(TIDAL_REACH_TILES).toBeLessThanOrEqual(5);
  });

  it("keeps classic ship speed outside 3D mode", () => {
    const map = {
      x: (tile: number) => tile,
      y: () => 0,
      config: () => ({ worldMechanics: () => ({ threeDMode: false }) }),
    };
    for (let tick = 0; tick < 20; tick++) {
      expect(shipStepsForRoute(map, tick, 9, 0, 10)).toBe(1);
    }
  });
});
