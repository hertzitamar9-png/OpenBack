import { describe, expect, it } from "vitest";
import {
  mobileInstanceFor,
  movementAnimation,
} from "../../../../src/client/render/gl/war-table/WarTableAnimationState";
import {
  WAR_TABLE_MOBILE_ORDER,
  miniatureFor,
} from "../../../../src/client/render/gl/war-table/WarTableMiniatureRegistry";
import {
  TrainType,
  UT_PLANE,
  UT_TANK,
  UT_TRAIN,
  UT_TRANSPORT,
} from "../../../../src/client/render/types";

describe("Living War Table mobile instances", () => {
  it("resolves every canonical mobile type to finite heading-aware data", () => {
    for (const unitType of WAR_TABLE_MOBILE_ORDER) {
      const instance = mobileInstanceFor({
        unitType,
        x: 12,
        y: 7,
        ownerID: 3,
        angle: 1.25,
        tick: 40,
        moving: true,
        trainType: null,
        loaded: null,
      });
      expect(instance.atlasColumn).toBe(miniatureFor(unitType).atlasColumn);
      expect(instance.heading).toBeCloseTo(1.25);
      expect(instance.scale).toBeGreaterThan(0);
      expect(
        [
          instance.x,
          instance.y,
          instance.ownerID,
          instance.atlasColumn,
          instance.heading,
          instance.scale,
          instance.groundOffset,
          instance.variant,
          instance.wakePhase,
          instance.wheelPhase,
          instance.exhaustPhase,
          instance.treadPhase,
        ].every(Number.isFinite),
      ).toBe(true);
    }
  });

  it("preserves train engine, carriage, and loaded-car identity", () => {
    const base = {
      unitType: UT_TRAIN,
      x: 1,
      y: 2,
      ownerID: 1,
      angle: 0,
      tick: 10,
      moving: true,
      loaded: false,
    } as const;
    expect(
      mobileInstanceFor({ ...base, trainType: TrainType.Engine }).variant,
    ).toBe(1);
    expect(
      mobileInstanceFor({ ...base, trainType: TrainType.Carriage }).variant,
    ).toBe(2);
    expect(
      mobileInstanceFor({
        ...base,
        trainType: TrainType.Carriage,
        loaded: true,
      }).variant,
    ).toBe(3);
  });

  it("keeps aircraft and tank identity while retaining their heading", () => {
    const input = {
      x: 5,
      y: 6,
      ownerID: 2,
      angle: 0.75,
      tick: 12,
      moving: true,
      trainType: null,
      loaded: null,
    };
    expect(mobileInstanceFor({ ...input, unitType: UT_PLANE })).toMatchObject({
      family: "aircraft",
      heading: 0.75,
    });
    expect(mobileInstanceFor({ ...input, unitType: UT_TANK })).toMatchObject({
      family: "armor",
      heading: 0.75,
    });
  });
});

describe("Living War Table movement animation", () => {
  it("derives bounded family motion from canonical ticks", () => {
    const ship = movementAnimation(UT_TRANSPORT, true, 25);
    expect(ship.wakePhase).toBeGreaterThanOrEqual(0);
    expect(ship.wakePhase).toBeLessThan(1);
    expect(ship.exhaustPhase).toBe(0);

    const parkedPlane = movementAnimation(UT_PLANE, false, 25);
    expect(parkedPlane.exhaustPhase).toBe(0);
    const movingPlane = movementAnimation(UT_PLANE, true, 25);
    expect(movingPlane.exhaustPhase).toBeGreaterThan(0);

    for (const value of Object.values(movementAnimation(UT_TANK, true, 999))) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
