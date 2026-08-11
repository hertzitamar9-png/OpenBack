import { beforeAll, describe, expect, it, vi } from "vitest";
import { Game } from "../../../src/core/game/Game";
import {
  findLandPath,
  reachableLandTiles,
} from "../../../src/core/pathfinding/PathFinder.Land";
import { setup } from "../../util/Setup";

describe("PathFinding.Land", () => {
  let game: Game;

  beforeAll(async () => {
    game = await setup("half_land_half_ocean");
  });

  it("finds a shortest land route and never enters water", () => {
    const path = findLandPath(game, game.ref(0, 0), game.ref(7, 15));
    expect(path).not.toBeNull();
    expect(path!.every((tile) => game.isLand(tile))).toBe(true);
    expect(path![path!.length - 1]).toBe(game.ref(7, 15));
    // Diagonal (8-neighbor) movement shortens the route below the old
    // 4-neighbor length of 23 and lets the unit face slant directions.
    expect(path!.length).toBeLessThan(23);
    const hasDiagonal = path!.slice(1).some((tile, index) => {
      const previous = path![index];
      return (
        game.x(tile) !== game.x(previous) && game.y(tile) !== game.y(previous)
      );
    });
    expect(hasDiagonal).toBe(true);
  });

  it("keeps the deterministic route without sorting the entire frontier", () => {
    const sort = vi.spyOn(Array.prototype, "sort");
    const path = findLandPath(game, game.ref(0, 0), game.ref(7, 15));

    expect(path).toEqual([
      0, 16, 32, 48, 64, 80, 96, 113, 130, 146, 162, 179, 196, 213, 230, 247,
    ]);
    expect(sort).not.toHaveBeenCalled();
    sort.mockRestore();
  });

  it("rejects destinations across a water barrier", () => {
    expect(findLandPath(game, game.ref(0, 0), game.ref(8, 0))).toBeNull();
  });

  it("collects every connected land destination within a vehicle radius", () => {
    const reachable = reachableLandTiles(game, game.ref(0, 0), 20);

    expect(reachable.has(game.ref(7, 15))).toBe(true);
    expect(reachable.has(game.ref(8, 0))).toBe(false);
  });
});
