import { describe, expect, it } from "vitest";

import { isParkedVehicleGlow } from "../../../../src/client/render/gl/passes/ParkedVehicleGlowPass";
import {
  UT_CITY,
  UT_PLANE,
  UT_TANK,
} from "../../../../src/client/render/types";
import type { UnitState } from "../../../../src/client/render/types/Renderer";

function unit(overrides: Partial<UnitState> = {}): UnitState {
  return {
    id: 1,
    unitType: UT_TANK,
    ownerID: 1,
    lastOwnerID: null,
    pos: 505,
    lastPos: 505,
    isActive: true,
    reachedTarget: false,
    retreating: false,
    targetable: false,
    markedForDeletion: false,
    health: null,
    underConstruction: false,
    targetUnitId: null,
    targetTile: null,
    troops: 0,
    missileTimerQueue: [],
    level: 1,
    veterancy: 0,
    hasTrainStation: false,
    trainType: null,
    loaded: null,
    constructionStartTick: null,
    ...overrides,
  };
}

describe("parked vehicle glow state", () => {
  it("shows for a loaded tank and clears as soon as it launches", () => {
    expect(isParkedVehicleGlow(unit({ loaded: true }))).toBe(true);
    expect(isParkedVehicleGlow(unit({ loaded: false }))).toBe(false);
  });

  it("shows while an aircraft loads and while it waits ready", () => {
    expect(
      isParkedVehicleGlow(
        unit({
          unitType: UT_PLANE,
          loaded: false,
          underConstruction: true,
        }),
      ),
    ).toBe(true);
    expect(
      isParkedVehicleGlow(unit({ unitType: UT_PLANE, loaded: true })),
    ).toBe(true);
  });

  it("clears for launched, destroyed, and unrelated units", () => {
    expect(
      isParkedVehicleGlow(unit({ unitType: UT_PLANE, loaded: false })),
    ).toBe(false);
    expect(isParkedVehicleGlow(unit({ isActive: false, loaded: true }))).toBe(
      false,
    );
    expect(isParkedVehicleGlow(unit({ unitType: UT_CITY, loaded: true }))).toBe(
      false,
    );
  });
});
