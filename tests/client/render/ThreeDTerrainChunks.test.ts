import { describe, expect, it } from "vitest";
import { ThreeDCameraState } from "../../../src/client/render/gl/three-d/ThreeDCamera";
import {
  ThreeDLODSelector,
  ThreeDTerrainChunks,
} from "../../../src/client/render/gl/three-d/ThreeDTerrainChunks";

function camera(centerX: number, centerZ: number, zoom = 2) {
  return ThreeDCameraState.create({
    viewportWidth: 1280,
    viewportHeight: 720,
    mapWidth: 4096,
    mapHeight: 2049,
    centerX,
    centerZ,
    zoom,
    yaw: 0.4,
    pitch: 1.05,
  });
}

describe("ThreeDTerrainChunks", () => {
  it("does not change chunk origins during sub-chunk camera movement", () => {
    const chunks = new ThreeDTerrainChunks(4096, 2049);
    const origins = (x: number, z: number) =>
      chunks
        .visible(camera(x, z))
        .map((chunk) => `${chunk.x}:${chunk.y}`)
        .sort();

    expect(origins(1000, 500)).toEqual(origins(1007, 506));
  });

  it("keeps the complete partial Antarctic edge available", () => {
    const chunks = new ThreeDTerrainChunks(4096, 2049);
    const visible = chunks.visible(camera(2048, 2010, 4));

    expect(visible.some((chunk) => chunk.worldBottom === 2049)).toBe(true);
    expect(visible.every((chunk) => chunk.worldBottom <= 2049)).toBe(true);
  });

  it("holds the previous LOD inside the hysteresis band", () => {
    const selector = new ThreeDLODSelector();
    expect(selector.choose(1.55, 1)).toBe(1);
    expect(selector.choose(1.1, 1)).toBe(1);
    expect(selector.choose(0.5, 1)).toBeGreaterThan(1);
  });

  it("balances adjacent chunks to at most one LOD step", () => {
    const chunks = new ThreeDTerrainChunks(4096, 2049);
    const visible = chunks.visible(camera(2048, 1024, 1));
    const byOrigin = new Map(
      visible.map((chunk) => [`${chunk.x}:${chunk.y}`, chunk]),
    );

    for (const chunk of visible) {
      for (const [dx, dy] of [
        [128, 0],
        [-128, 0],
        [0, 128],
        [0, -128],
      ]) {
        const neighbor = byOrigin.get(`${chunk.x + dx}:${chunk.y + dy}`);
        if (neighbor)
          expect(Math.abs(chunk.lod - neighbor.lod)).toBeLessThanOrEqual(1);
      }
    }
  });

  it("uses one edge-compatible LOD across a visible frame", () => {
    const chunks = new ThreeDTerrainChunks(4096, 2049);
    const visible = chunks.visible(camera(2048, 1024, 1));
    expect(new Set(visible.map((chunk) => chunk.lod)).size).toBe(1);
  });

  it("tracks dirty world regions by stable chunk key", () => {
    const chunks = new ThreeDTerrainChunks(4096, 2049);
    chunks.markDirty({ left: 127, top: 127, right: 129, bottom: 129 });
    expect(chunks.consumeDirty().sort()).toEqual([
      "0:0",
      "0:128",
      "128:0",
      "128:128",
    ]);
    expect(chunks.consumeDirty()).toEqual([]);
  });
});
