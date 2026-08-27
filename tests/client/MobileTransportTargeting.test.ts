import { describe, expect, test, vi } from "vitest";
import { landTargetAtScreenPoint } from "../../src/client/input/PointerTarget";
import type { TileRef } from "../../src/core/game/GameMap";

describe("mobile transport targeting", () => {
  const nearIslandTile = 201 as TileRef;
  const farIslandTile = 909 as TileRef;
  const waterTile = 505 as TileRef;

  test("a nearby-island release preserves the exact selected tile", () => {
    const transform = {
      screenToWorldCoordinates: vi.fn(() => ({ x: 2, y: 1 })),
    };
    const game = {
      isValidCoord: () => true,
      ref: () => nearIslandTile,
      isLand: (tile: TileRef) => tile !== waterTile,
    };

    expect(landTargetAtScreenPoint(game, transform, { x: 240, y: 120 })).toBe(
      nearIslandTile,
    );
    expect(
      landTargetAtScreenPoint(game, transform, { x: 240, y: 120 }),
    ).not.toBe(farIslandTile);
    expect(transform.screenToWorldCoordinates).toHaveBeenLastCalledWith(
      240,
      120,
    );
  });

  test("a water release is rejected instead of redirected", () => {
    const transform = {
      screenToWorldCoordinates: vi.fn(() => ({ x: 5, y: 5 })),
    };
    const game = {
      isValidCoord: () => true,
      ref: () => waterTile,
      isLand: () => false,
    };

    expect(
      landTargetAtScreenPoint(game, transform, { x: 200, y: 110 }),
    ).toBeNull();
  });
});
