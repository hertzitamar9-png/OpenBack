import { describe, expect, it } from "vitest";
import {
  buildCompleteMapSurface,
  buildSolidMapBase,
  buildTerrainGrid,
  terrainEdgeCoordinates,
} from "../../../src/client/render/gl/three-d/ThreeDTerrainMesh";

describe("ThreeDTerrainMesh", () => {
  it("builds finite indexed terrain triangles", () => {
    const mesh = buildTerrainGrid(32, 16);
    expect(mesh.indices.length).toBe(32 * 16 * 6);
    expect(mesh.indices.length % 3).toBe(0);
    expect([...mesh.positions].every(Number.isFinite)).toBe(true);
  });

  it("shares exact world edge samples between neighboring LOD chunks", () => {
    const left = terrainEdgeCoordinates(0, 0, 128, 128, 2, "right");
    const right = terrainEdgeCoordinates(128, 0, 128, 128, 4, "left");
    expect(left.filter((_, index) => index % 2 === 0)).toEqual(right);
  });

  it("builds a closed solid base with side and bottom faces", () => {
    const base = buildSolidMapBase(2048, 1024, -0.5, -18);
    expect(base.positions.length / 3).toBe(8);
    expect(base.indices.length).toBe(36);
    expect(
      Math.min(...base.positions.filter((_, index) => index % 3 === 1)),
    ).toBe(-18);
  });

  it("keeps the closed board below the ocean depth plane", () => {
    const base = buildSolidMapBase(2048, 1024);
    const heights = base.positions.filter((_, index) => index % 3 === 1);
    expect(Math.max(...heights)).toBeGreaterThanOrEqual(-2);
    expect(Math.max(...heights)).toBeLessThanOrEqual(-1);
  });

  it("covers every irregular map coordinate with water and a closed base", () => {
    const surface = buildCompleteMapSurface(731, 413, -0.08, -40);

    const water = [...surface.water.positions];
    expect(water.filter((_, index) => index % 3 === 0)).toEqual([
      0, 731, 731, 0,
    ]);
    expect(water.filter((_, index) => index % 3 === 2)).toEqual([
      0, 0, 413, 413,
    ]);
    for (const y of water.filter((_, index) => index % 3 === 1)) {
      expect(y).toBeCloseTo(-0.08, 5);
    }
    expect(surface.water.indices.length).toBe(6);
    expect(surface.base.positions.length / 3).toBe(8);
    expect(Math.min(...surface.base.positions)).toBeLessThanOrEqual(-40);
  });
});
