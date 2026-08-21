import { describe, expect, it } from "vitest";

import {
  MAX_TURN_PER_TICK,
  turnToward,
  unitSpriteHeading,
} from "../../../../src/client/render/gl/passes/UnitPass";
import type { UnitState } from "../../../../src/client/render/types/Renderer";
import { UnitType } from "../../../../src/core/game/Game";

function unit(overrides: Partial<UnitState>): UnitState {
  return {
    id: 1,
    unitType: UnitType.TransportShip,
    pos: 11 * 100 + 11,
    lastPos: 10 * 100 + 10,
    ownerID: 1,
    isActive: true,
    visibleToLocal: true,
    underConstruction: false,
    ...overrides,
  } as UnitState;
}

describe("unit sprite heading", () => {
  it("points a ship along its latest curved path segment", () => {
    const heading = unitSpriteHeading(unit({ trajectoryAngle: 0 }), 100);

    expect(heading).toBeCloseTo(Math.atan2(1, -1));
  });

  it("keeps the authoritative aircraft trajectory heading", () => {
    const heading = unitSpriteHeading(
      unit({ unitType: UnitType.Plane, trajectoryAngle: 1.125 }),
      100,
    );

    expect(heading).toBeCloseTo(1.125);
  });

  it("reports no heading for a unit that did not move", () => {
    // Ships step one tile at a time, so most ticks produce no movement. This
    // used to answer "due north", which snapped them back to facing up between
    // steps instead of pointing where they were going.
    expect(unitSpriteHeading(unit({ pos: 500, lastPos: 500 }), 100)).toBeNull();
  });

  it("reads a heading for every direction of travel, not just forward", () => {
    // pos 11*100+11 is one tile south-east of lastPos 10*100+10.
    const at = (dx: number, dy: number) =>
      unitSpriteHeading(
        unit({ pos: (10 + dy) * 100 + (10 + dx), lastPos: 10 * 100 + 10 }),
        100,
      );

    const headings = new Map<string, number | null>([
      ["north", at(0, -1)],
      ["north-east", at(1, -1)],
      ["east", at(1, 0)],
      ["south-east", at(1, 1)],
      ["south", at(0, 1)],
      ["south-west", at(-1, 1)],
      ["west", at(-1, 0)],
      ["north-west", at(-1, -1)],
    ]);

    // Every direction resolves, and they are all distinct: no direction of
    // travel collapses onto another.
    for (const [, value] of headings) expect(value).not.toBeNull();
    const distinct = new Set(
      [...headings.values()].map((v) => Math.round(v! * 1000)),
    );
    expect(distinct.size).toBe(8);
    expect(headings.get("north")).toBeCloseTo(0);
    expect(headings.get("east")).toBeCloseTo(Math.PI / 2);
  });
});

describe("turning toward a new heading", () => {
  it("steps gradually rather than snapping", () => {
    const turned = turnToward(0, Math.PI / 2, MAX_TURN_PER_TICK);
    expect(turned).toBeCloseTo(MAX_TURN_PER_TICK);
    expect(turned).toBeLessThan(Math.PI / 2);
  });

  it("settles exactly on the target once within one step", () => {
    expect(turnToward(1.0, 1.1, MAX_TURN_PER_TICK)).toBe(1.1);
  });

  it("turns the short way round the wrap point", () => {
    // Either side of the +/-PI wrap. The naive difference is nearly a full
    // turn, which would send a vessel spinning right around to change heading
    // by a third of a radian.
    const current = -Math.PI + 0.05;
    const target = Math.PI - 0.5;
    const next = turnToward(current, target, MAX_TURN_PER_TICK);

    // It steps across the wrap (further negative), not back around the circle.
    expect(next).toBeCloseTo(current - MAX_TURN_PER_TICK, 9);

    // And the whole turn is the short one: 0.55 radians, not 2PI - 0.55.
    const shortest = Math.abs(
      Math.atan2(Math.sin(target - current), Math.cos(target - current)),
    );
    expect(shortest).toBeCloseTo(0.55, 9);
  });

  it("reaches any heading in a bounded number of ticks", () => {
    for (const target of [0, 1, -1, 2.5, -2.5, Math.PI - 0.01]) {
      let heading = 0;
      let ticks = 0;
      while (Math.abs(heading - target) > 1e-9 && ticks < 100) {
        heading = turnToward(heading, target, MAX_TURN_PER_TICK);
        ticks++;
      }
      expect(heading).toBeCloseTo(target, 9);
      // Half a turn at 10 ticks per second is well under a second.
      expect(ticks).toBeLessThanOrEqual(10);
    }
  });
});
