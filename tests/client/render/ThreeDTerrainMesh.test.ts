import { describe, expect, it } from "vitest";
import {
  buildCompleteMapSurface,
  buildMapEdgeSkirt,
  buildSolidMapBase,
  buildTerrainGrid,
  buildWaterGrid,
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
    expect(water[0]).toBe(0);
    expect(water[1]).toBeCloseTo(-0.08, 5);
    expect(water[2]).toBe(0);
    expect(water[water.length - 3]).toBe(731);
    expect(water[water.length - 2]).toBeCloseTo(-0.08, 5);
    expect(water[water.length - 1]).toBe(413);
    for (const y of water.filter((_, index) => index % 3 === 1)) {
      expect(y).toBeCloseTo(-0.08, 5);
    }
    expect(surface.water.indices.length).toBe(192 * 96 * 6);
    expect(surface.base.positions.length / 3).toBe(8);
    expect(Math.min(...surface.base.positions)).toBeLessThanOrEqual(-40);
  });

  it("subdivides the complete ocean so waves can displace real vertices", () => {
    const water = buildWaterGrid(731, 413, 12, 7, -0.08);

    expect(water.positions.length / 3).toBe(13 * 8);
    expect(water.indices.length).toBe(12 * 7 * 6);
    expect([...water.positions, ...water.indices].every(Number.isFinite)).toBe(
      true,
    );
    expect(water.positions[0]).toBe(0);
    expect(water.positions[1]).toBeCloseTo(-0.08, 5);
    expect(water.positions[2]).toBe(0);
    expect(water.positions[water.positions.length - 3]).toBe(731);
    expect(water.positions[water.positions.length - 2]).toBeCloseTo(-0.08, 5);
    expect(water.positions[water.positions.length - 1]).toBe(413);
  });

  it("builds a continuous terrain skirt around every map edge", () => {
    const skirt = buildMapEdgeSkirt(731, 413, 12, 7);
    expect(skirt.positions.length / 3).toBe((12 + 1) * 4 + (7 + 1) * 4);
    expect(skirt.indices.length).toBe((12 * 2 + 7 * 2) * 6);
    expect([...skirt.positions, ...skirt.indices].every(Number.isFinite)).toBe(
      true,
    );
  });
});
