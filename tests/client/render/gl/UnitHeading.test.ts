import { describe, expect, it } from "vitest";

import { unitSpriteHeading } from "../../../../src/client/render/gl/passes/UnitPass";
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
});
