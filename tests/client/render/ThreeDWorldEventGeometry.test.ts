import { describe, expect, it } from "vitest";
import { buildWorldEventParticleMesh } from "../../../src/client/render/gl/three-d/ThreeDWorldEventGeometry";

describe("ThreeDWorldEventGeometry", () => {
  it("builds finite volumetric triangles instead of flat point sprites", () => {
    const mesh = buildWorldEventParticleMesh();

    expect(mesh.positions.length % 3).toBe(0);
    expect(mesh.indices.length % 3).toBe(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect([...mesh.positions, ...mesh.indices].every(Number.isFinite)).toBe(
      true,
    );
    expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3);

    for (let axis = 0; axis < 3; axis++) {
      const values = mesh.positions.filter((_, index) => index % 3 === axis);
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.5);
    }
  });
});
