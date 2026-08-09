import { describe, expect, it } from "vitest";
import {
  barrel,
  beveledBox,
  box,
  cone,
  cylinder,
  extrudedSilhouette,
  hull,
  roof,
  trackedChassis,
  wedge,
  wing,
} from "../../../src/client/render/gl/three-d/ThreeDGeometry";

const BUILDERS = {
  box,
  beveledBox,
  cylinder,
  cone,
  wedge,
  wing,
  hull,
  trackedChassis,
  roof,
  barrel,
  extrudedSilhouette: () =>
    extrudedSilhouette(
      [
        [-0.7, -0.4],
        [0.8, -0.25],
        [0.55, 0.5],
        [-0.6, 0.45],
      ],
      0.3,
    ),
};

describe("ThreeDGeometry", () => {
  for (const [name, build] of Object.entries(BUILDERS)) {
    it(`${name} produces finite indexed triangles and normals`, () => {
      const mesh = build();
      expect(mesh.indices.length % 3).toBe(0);
      expect(mesh.positions.length).toBe(mesh.normals.length);
      expect([...mesh.positions, ...mesh.normals].every(Number.isFinite)).toBe(
        true,
      );
      expect(mesh.bounds.min.y).toBeLessThanOrEqual(mesh.bounds.max.y);
      expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3);
    });
  }
});
