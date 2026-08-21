import { describe, expect, it } from "vitest";
import {
  CYCLE_TICKS,
  isFloodableLand,
  isTidalCoast,
  NIGHT_FOUNDER_PEAK_CHANCE,
  nightDepth,
  shipCurrentMultiplier,
  shipFoundersAtNight,
  shipMovementSteps,
  shipStepsForRoute,
  THREE_D_WAVE_HEIGHT_SCALE,
  threeDWorldCycle,
  TIDAL_REACH_TILES,
} from "../../../src/core/world/ThreeDWorldCycle";

describe("deterministic 3D world cycle", () => {
  // The simulation runs at 10 ticks per second.
  const TICKS_PER_SECOND = 10;

  it("runs five minutes of day and five minutes of night", () => {
    expect(CYCLE_TICKS / TICKS_PER_SECOND).toBe(600);

    let nightTicks = 0;
    for (let tick = 0; tick < CYCLE_TICKS; tick++) {
      if (threeDWorldCycle(tick).isNight) nightTicks++;
    }
    expect(nightTicks / TICKS_PER_SECOND).toBe(300);
    expect((CYCLE_TICKS - nightTicks) / TICKS_PER_SECOND).toBe(300);
  });

  it("derives repeatable bounded daylight, tide, waves, and current", () => {
    const quarter = CYCLE_TICKS / 4;
    for (const tick of [
      0,
      quarter,
      quarter * 2,
      quarter * 3,
      CYCLE_TICKS,
      12_345,
    ]) {
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
    const night = threeDWorldCycle(CYCLE_TICKS / 2);
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
    const night = threeDWorldCycle(CYCLE_TICKS / 2);
    // Crests must stand tall enough to read against the terrain beside them:
    // a magnitude-10 hill is about 5.4 world units, so sub-unit waves vanish.
    expect(THREE_D_WAVE_HEIGHT_SCALE).toBeGreaterThanOrEqual(1.5);
    // ...but never so tall they tower over real hills.
    // ...but never so tall the sea sits above the land it surrounds.
    expect(THREE_D_WAVE_HEIGHT_SCALE).toBeLessThan(8);
    expect(day.waveStrength * THREE_D_WAVE_HEIGHT_SCALE).toBeGreaterThan(2.5);
    expect(night.waveStrength * THREE_D_WAVE_HEIGHT_SCALE).toBeGreaterThan(4);
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
      config: () => ({ experienceMode: () => "2d" as const }),
    };
    for (let tick = 0; tick < 20; tick++) {
      expect(shipStepsForRoute(map, tick, 9, 0, 10)).toBe(1);
    }
  });
});

// Vessels can be lost to the sea, but only after dark. Every client runs the
// simulation on its own, so which hull goes under has to be a decision each of
// them reaches alone and all of them agree on -- hence a hash of the tick and
// the unit's id rather than a draw from anyone's PRNG.
describe("ships foundering at night", () => {
  const NIGHT = Math.round(CYCLE_TICKS * 0.5); // midnight
  const DAY = 0;
  const HEAVY = 1.2;

  it("never takes a ship in daylight", () => {
    for (let tick = 0; tick < CYCLE_TICKS; tick++) {
      if (nightDepth(tick) > 0) continue;
      for (let id = 1; id <= 40; id++) {
        expect(shipFoundersAtNight(tick, id, HEAVY)).toBe(false);
      }
    }
    expect(nightDepth(DAY)).toBe(0);
  });

  it("gives every client the same answer", () => {
    for (let id = 1; id <= 50; id++) {
      const first = shipFoundersAtNight(NIGHT + id, id, HEAVY);
      for (let repeat = 0; repeat < 5; repeat++) {
        expect(shipFoundersAtNight(NIGHT + id, id, HEAVY)).toBe(first);
      }
    }
  });

  it("does take ships once it is dark", () => {
    let lost = 0;
    for (let tick = NIGHT; tick < NIGHT + 400; tick++) {
      for (let id = 1; id <= 200; id++) {
        if (shipFoundersAtNight(tick, id, HEAVY)) lost++;
      }
    }
    expect(lost).toBeGreaterThan(0);
  });

  it("is a risk worth weighing, not a toll", () => {
    // One vessel crossing for 300 ticks through the worst of the night.
    let survived = 0;
    const fleet = 400;
    for (let id = 1; id <= fleet; id++) {
      let alive = true;
      for (let tick = NIGHT - 150; tick < NIGHT + 150 && alive; tick++) {
        if (shipFoundersAtNight(tick, id, HEAVY)) alive = false;
      }
      if (alive) survived++;
    }
    const lossRate = 1 - survived / fleet;
    // Losing some, but most crossings get through.
    expect(lossRate).toBeGreaterThan(0.01);
    expect(lossRate).toBeLessThan(0.25);
  });

  it("is worse the deeper into the night it gets", () => {
    const rate = (tick: number) => {
      let lost = 0;
      for (let id = 1; id <= 4000; id++) {
        if (shipFoundersAtNight(tick, id, HEAVY)) lost++;
      }
      return lost / 4000;
    };
    // Dusk barely touches them; midnight is the peak.
    expect(nightDepth(Math.round(CYCLE_TICKS * 0.5))).toBeCloseTo(1, 6);
    expect(rate(NIGHT)).toBeGreaterThan(rate(Math.round(CYCLE_TICKS * 0.29)));
    expect(rate(NIGHT)).toBeLessThanOrEqual(NIGHT_FOUNDER_PEAK_CHANCE * 2);
  });
});
