import { describe, expect, test, vi } from "vitest";
import { targetTileAtScreenPoint } from "../../../src/client/input/PointerTarget";
import type { TileRef } from "../../../src/core/game/GameMap";

describe("targetTileAtScreenPoint", () => {
  test("resolves the visible release point through the transform exactly once", () => {
    const expectedTile = 1234 as TileRef;
    const transform = {
      screenToWorldCoordinates: vi.fn(() => ({ x: 17, y: 9 })),
    };
    const game = {
      isValidCoord: vi.fn(() => true),
      ref: vi.fn(() => expectedTile),
    };

    expect(targetTileAtScreenPoint(game, transform, { x: 210, y: 130 })).toBe(
      expectedTile,
    );
    expect(transform.screenToWorldCoordinates).toHaveBeenCalledOnce();
    expect(transform.screenToWorldCoordinates).toHaveBeenCalledWith(210, 130);
    expect(game.ref).toHaveBeenCalledWith(17, 9);
  });

  test("rejects a projected point outside the map", () => {
    const transform = {
      screenToWorldCoordinates: vi.fn(() => ({ x: -1, y: 9 })),
    };
    const game = {
      isValidCoord: vi.fn(() => false),
      ref: vi.fn(),
    };

    expect(
      targetTileAtScreenPoint(game, transform, { x: 0, y: 20 }),
    ).toBeNull();
    expect(game.ref).not.toHaveBeenCalled();
  });
});
