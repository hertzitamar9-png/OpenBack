import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseGlbMesh } from "../../../src/client/render/gl/three-d/GltfBinary";
import {
  THREE_D_ASSET_MANIFEST,
  threeDAsset,
} from "../../../src/client/render/gl/three-d/ThreeDAssetManifest";
import { UnitType } from "../../../src/core/game/Game";

describe("3D asset manifest", () => {
  it("ships one verified local GLB for every gameplay unit", () => {
    for (const type of Object.values(UnitType)) {
      const definition = threeDAsset(type);
      expect(definition, `${type} is missing a real 3D asset`).toBeDefined();
      expect(definition.url).toMatch(/^3d\/models\/[a-z0-9-]+\.glb$/);
      expect(definition.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(definition.sourceUrl).toMatch(/^https:\/\//);
      expect(definition.creator.length).toBeGreaterThan(0);
      expect(["CC0-1.0", "CC-BY-3.0", "CC-BY-4.0"]).toContain(
        definition.license,
      );

      const file = path.join(process.cwd(), "resources", definition.url);
      expect(existsSync(file), `${definition.url} does not exist`).toBe(true);
      const actual = createHash("sha256")
        .update(readFileSync(file))
        .digest("hex");
      expect(actual, `${definition.url} checksum changed`).toBe(
        definition.sha256,
      );
    }
  });

  it("contains exactly the UnitType catalog with no stale aliases", () => {
    expect(Object.keys(THREE_D_ASSET_MANIFEST).sort()).toEqual(
      Object.values(UnitType).sort(),
    );
  });

  it("parses every shipped model into renderable triangles", () => {
    for (const type of Object.values(UnitType)) {
      const definition = threeDAsset(type);
      const source = readFileSync(
        path.join(process.cwd(), "resources", definition.url),
      );
      const mesh = parseGlbMesh(
        source.buffer.slice(
          source.byteOffset,
          source.byteOffset + source.byteLength,
        ),
        definition.url,
      );
      expect(mesh.vertices.length, `${type} has no vertices`).toBeGreaterThan(
        0,
      );
      expect(mesh.indices.length, `${type} has no triangles`).toBeGreaterThan(
        0,
      );
    }
  });
});
