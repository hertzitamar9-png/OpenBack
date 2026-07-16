import { describe, expect, it, vi } from "vitest";
import { GameMapSize, GameMapType } from "../../../src/core/game/Game";
import { GameMapLoader } from "../../../src/core/game/GameMapLoader";
import { loadTerrainMap } from "../../../src/core/game/TerrainMapLoader";

describe("TerrainMapLoader view mode", () => {
  it("does not decode the simulation-only minimap for the browser view", async () => {
    const map4xBin = vi.fn(async () => new Uint8Array([0]));
    const loader: GameMapLoader = {
      getMapData: () => ({
        mapBin: async () => new Uint8Array(16),
        map4xBin,
        map16xBin: async () => new Uint8Array([0]),
        manifest: async () => ({
          name: "view-only-test",
          map: { width: 4, height: 4, num_land_tiles: 0 },
          map4x: { width: 1, height: 1, num_land_tiles: 0 },
          map16x: { width: 1, height: 1, num_land_tiles: 0 },
          nations: [],
        }),
        webpPath: "",
      }),
    };

    const terrain = await loadTerrainMap(
      GameMapType.Achiran,
      GameMapSize.Normal,
      loader,
      { loadMiniMap: false },
    );

    expect(terrain.miniGameMap).toBe(terrain.gameMap);
    expect(map4xBin).not.toHaveBeenCalled();
  });
});
