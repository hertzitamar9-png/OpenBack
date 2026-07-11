import { beforeAll, describe, expect, it } from "vitest";
import { Game } from "../../../src/core/game/Game";
import { findLandPath } from "../../../src/core/pathfinding/PathFinder.Land";
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
  });

  it("rejects destinations across a water barrier", () => {
    expect(findLandPath(game, game.ref(0, 0), game.ref(8, 0))).toBeNull();
  });
});
