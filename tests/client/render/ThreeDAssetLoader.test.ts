import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearThreeDAssetCache,
  loadThreeDAsset,
} from "../../../src/client/render/gl/three-d/ThreeDAssetLoader";
import { threeDAsset } from "../../../src/client/render/gl/three-d/ThreeDAssetManifest";
import { UnitType } from "../../../src/core/game/Game";

describe("3D asset loader", () => {
  afterEach(() => {
    clearThreeDAssetCache();
    vi.unstubAllGlobals();
  });

  it("fetches and parses each URL only once", async () => {
    const source = readFileSync(
      path.join(process.cwd(), "resources/3d/models/tank-mine.glb"),
    );
    const fetchMock = vi.fn(async () => new Response(source, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const definition = threeDAsset(UnitType.TankMine);
    const [first, second] = await Promise.all([
      loadThreeDAsset(definition),
      loadThreeDAsset(definition),
    ]);
    expect(first).toBe(second);
    expect(first.vertices.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
