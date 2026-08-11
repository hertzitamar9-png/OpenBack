import { describe, expect, it } from "vitest";
import {
  isPointerOverVehicleSource,
  vehicleSourceHoverHalfExtent,
} from "../../src/client/controllers/VehicleSourceHover";
import { UnitType } from "../../src/core/game/Game";

describe("vehicle source hover", () => {
  it("matches the visible icon footprint instead of the 15-tile snap range", () => {
    const half = vehicleSourceHoverHalfExtent(3, UnitType.Runway);
    expect(half).toBeCloseTo(8.5, 5);
    expect(
      isPointerOverVehicleSource(
        { x: 108.9, y: 100.5 },
        { x: 100, y: 100 },
        3,
        UnitType.Runway,
      ),
    ).toBe(true);
    expect(
      isPointerOverVehicleSource(
        { x: 109.1, y: 100.5 },
        { x: 100, y: 100 },
        3,
        UnitType.Runway,
      ),
    ).toBe(false);
  });

  it("keeps the directly hovered icon usable at overview and close zoom", () => {
    for (const zoom of [0.5, 2, 12]) {
      expect(
        isPointerOverVehicleSource(
          { x: 40.5, y: 21.5 },
          { x: 40, y: 21 },
          zoom,
          UnitType.MilitaryBase,
        ),
      ).toBe(true);
    }
  });
});
