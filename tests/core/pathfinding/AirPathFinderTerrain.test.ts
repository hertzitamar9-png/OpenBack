import { describe, expect, it } from "vitest";
import type { Game } from "../../../src/core/game/Game";
import { AirPathFinder } from "../../../src/core/pathfinding/PathFinder.Air";

function gridGame(experienceMode: "2d" | "3d"): Game {
  const width = 9;
  const heights = new Uint8Array(width * width).fill(0x81);
  // A wall of tall terrain down the middle, which the old 3D rules treated as
  // a barrier and the flat game flew straight over.
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

/**
 * Aircraft fly one way, whichever experience you are in.
 *
 * Immersive 3D briefly had rules of its own: no landing on terrain of
 * magnitude 18 or more, and rerouting around anything that tall. The reroute
 * returned no path at all when no corridor existed, so a plane simply could
 * not be sent -- while the same order in the flat game flew without complaint.
 * That is what made aircraft feel unplaceable in 3D.
 */
describe("aircraft routing is the same in both experiences", () => {
  it("flies the identical route in 2D and 3D", () => {
    const from = 1 * 9 + 3;
    const to = 7 * 9 + 3;
    const flat = new AirPathFinder(gridGame("2d")).findPath(from, to);
    const immersive = new AirPathFinder(gridGame("3d")).findPath(from, to);

    expect(flat).not.toBeNull();
    expect(immersive).toEqual(flat);
  });

  it("flies straight over tall terrain rather than refusing it", () => {
    const game = gridGame("3d");
    const path = new AirPathFinder(game).findPath(
      game.ref(1, 3),
      game.ref(7, 3),
    )!;

    // The direct line crosses the wall, as it always did in the flat game.
    expect(path.some((tile) => game.magnitude(tile) >= 18)).toBe(true);
  });

  it("lands on tall terrain in both experiences", () => {
    for (const mode of ["2d", "3d"] as const) {
      const game = gridGame(mode);
      const destination = game.ref(4, 3);
      expect(game.magnitude(destination)).toBeGreaterThanOrEqual(18);
      // This returned null in 3D, which is what stopped the plane being sent.
      expect(
        new AirPathFinder(game).findPath(game.ref(1, 3), destination),
      ).not.toBeNull();
    }
  });

  it("stays deterministic, so every client agrees on the route", () => {
    const game = gridGame("3d");
    const first = new AirPathFinder(game).findPath(
      game.ref(1, 3),
      game.ref(7, 3),
    );
    const second = new AirPathFinder(game).findPath(
      game.ref(1, 3),
      game.ref(7, 3),
    );
    expect(first).toEqual(second);
  });
});
