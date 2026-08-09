import { describe, expect, it } from "vitest";
import {
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
});
