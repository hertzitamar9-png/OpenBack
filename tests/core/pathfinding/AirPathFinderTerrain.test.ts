import { describe, expect, it } from "vitest";
import type { Game } from "../../../src/core/game/Game";
import {
  AirPathFinder,
  isAircraftLandingTooHigh,
} from "../../../src/core/pathfinding/PathFinder.Air";

function gridGame(experienceMode: "2d" | "3d"): Game {
  const width = 9;
  const heights = new Uint8Array(width * width).fill(0x81);
  for (let y = 0; y < width - 1; y++) heights[y * width + 4] = 0x9f;
  return {
    ticks: () => 7,
    width: () => width,
    height: () => width,
    x: (tile: number) => tile % width,
    y: (tile: number) => Math.floor(tile / width),
    ref: (x: number, y: number) => y * width + x,
    magnitude: (tile: number) => heights[tile] & 0x1f,
    isValidRef: (tile: number) => tile >= 0 && tile < heights.length,
    config: () => ({ experienceMode: () => experienceMode }),
  } as unknown as Game;
}

describe("terrain-aware aircraft routing", () => {
  it("deterministically routes a low 3D aircraft around mountain terrain", () => {
    const game = gridGame("3d");
    const start = game.ref(1, 3);
    const destination = game.ref(7, 3);
    const first = new AirPathFinder(game).findPath(start, destination)!;
    const second = new AirPathFinder(game).findPath(start, destination)!;
    expect(first).toEqual(second);
    expect(first.some((tile) => game.magnitude(tile) >= 18)).toBe(false);
    expect(first).toContain(game.ref(4, 8));
  });

  it("keeps the established direct air route outside 3D mode", () => {
    const game = gridGame("2d");
    const path = new AirPathFinder(game).findPath(
      game.ref(1, 3),
      game.ref(7, 3),
    )!;
    expect(path.some((tile) => game.magnitude(tile) >= 18)).toBe(true);
  });

  it("rejects a mountain landing in 3D mode", () => {
    const game = gridGame("3d");
    const destination = game.ref(4, 3);
    expect(game.magnitude(destination)).toBeGreaterThanOrEqual(18);
    expect(isAircraftLandingTooHigh(game, destination)).toBe(true);
    expect(
      new AirPathFinder(game).findPath(game.ref(1, 3), destination),
    ).toBeNull();
  });

  it("keeps mountain landing unrestricted in 2D mode", () => {
    const game = gridGame("2d");
    const destination = game.ref(4, 3);
    expect(isAircraftLandingTooHigh(game, destination)).toBe(false);
    expect(
      new AirPathFinder(game).findPath(game.ref(1, 3), destination),
    ).not.toBeNull();
  });
});
