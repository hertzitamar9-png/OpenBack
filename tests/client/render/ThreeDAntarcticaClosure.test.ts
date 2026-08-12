import { describe, expect, it } from "vitest";
import { buildSouthernLandClosure } from "../../../src/client/render/gl/three-d/ThreeDTerrainMesh";

describe("3D southern land closure", () => {
  it("follows contiguous southern land and skips ocean columns", () => {
    const width = 12;
    const height = 8;
    const terrain = new Uint8Array(width * height);
    for (const [x, y] of [
      [2, 6],
      [3, 6],
      [4, 5],
      [5, 6],
    ] as const)
      terrain[y * width + x] = 128;
    const mesh = buildSouthernLandClosure(terrain, width, height);
    expect(mesh.indices.length % 3).toBe(0);
    expect([...mesh.positions, ...mesh.indices].every(Number.isFinite)).toBe(
      true,
    );
    const columns = new Set<number>();
    for (let i = 0; i < mesh.positions.length; i += 3)
      columns.add(mesh.positions[i]);
    expect([...columns]).toEqual([2, 3, 4, 5, 6]);
  });
});
