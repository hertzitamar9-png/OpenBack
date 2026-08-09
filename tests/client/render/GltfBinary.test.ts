import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseGlbMesh } from "../../../src/client/render/gl/three-d/GltfBinary";

describe("GLB binary mesh parser", () => {
  it("extracts and normalizes the bundled city geometry", () => {
    const source = readFileSync(
      path.join(process.cwd(), "resources/3d/models/city.glb"),
    );
    const mesh = parseGlbMesh(
      source.buffer.slice(
        source.byteOffset,
        source.byteOffset + source.byteLength,
      ),
      "city.glb",
    );
    expect(mesh.vertices.length).toBeGreaterThan(100);
    expect(mesh.vertices.length % 6).toBe(0);
    expect(mesh.indices.length).toBeGreaterThan(100);
    expect(mesh.indices.length % 3).toBe(0);
    const horizontal = mesh.vertices.filter(
      (_, i) => i % 6 === 0 || i % 6 === 2,
    );
    const vertical = mesh.vertices.filter((_, i) => i % 6 === 1);
    expect(Math.max(...horizontal)).toBeLessThanOrEqual(0.51);
    expect(Math.min(...horizontal)).toBeGreaterThanOrEqual(-0.51);
    expect(Math.min(...vertical)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...vertical)).toBeLessThanOrEqual(1.01);
  });

  it("rejects malformed input with the asset name", () => {
    expect(() => parseGlbMesh(new ArrayBuffer(16), "broken.glb")).toThrow(
      /broken\.glb/,
    );
  });
});
