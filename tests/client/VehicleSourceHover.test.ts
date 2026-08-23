import { describe, expect, it, vi } from "vitest";
import { BuildPreviewController } from "../../src/client/controllers/BuildPreviewController";
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

  it("keeps an occupied source available for its hover radius", () => {
    const sourceTile = 17;
    const source = {
      isActive: () => true,
      isUnderConstruction: () => false,
      tile: () => sourceTile,
      level: () => 1,
    };
    const parkedTank = { isActive: () => true, tile: () => sourceTile };
    const player = {
      units: (type: UnitType) => {
        if (type === UnitType.MilitaryBase) return [source];
        if (type === UnitType.Tank) return [parkedTank];
        return [];
      },
    };
    const controller = Object.create(BuildPreviewController.prototype) as {
      game: unknown;
      transformHandler: unknown;
      mousePos: { x: number; y: number };
      vehicleSourceUnderPointer(
        player: unknown,
        type: UnitType,
        includeOccupied: boolean,
      ): number | undefined;
    };
    controller.game = {
      isValidCoord: () => true,
      x: () => 40,
      y: () => 21,
    };
    controller.transformHandler = {
      scale: 3,
      screenToWorldCoordinatesFloat: () => ({ x: 40.5, y: 21.5 }),
    };
    controller.mousePos = { x: 100, y: 100 };

    expect(
      controller.vehicleSourceUnderPointer(player, UnitType.Tank, false),
    ).toBeUndefined();
    expect(
      controller.vehicleSourceUnderPointer(player, UnitType.MilitaryBase, true),
    ).toBe(sourceTile);

    const updateHoverRange = vi.fn();
    Object.assign(controller, {
      view: { updateHoverRange },
      game: {
        isValidCoord: () => true,
        x: () => 40,
        y: () => 21,
        myPlayer: () => player,
        config: () => ({ tankMaxDriveRadius: () => 123 }),
      },
    });
    (
      controller as unknown as { updateHoveredSourceRange(): void }
    ).updateHoveredSourceRange();
    expect(updateHoverRange).toHaveBeenLastCalledWith({
      x: 40,
      y: 21,
      radius: 123,
    });
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
