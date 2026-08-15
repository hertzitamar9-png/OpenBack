import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("3D water cycle shader", () => {
  it("uses authoritative cycle uniforms for raised waves, foam, and coast retreat", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/client/render/gl/passes/ThreeDCompositePass.ts",
      ),
      "utf8",
    );
    expect(source).toContain("uGameTick");
    expect(source).toContain("gerstnerWave");
    expect(source).toContain("shoreBreak");
    expect(source).toContain("foamCrest");
    expect(source).toContain("uDaylight");
    expect(source).toContain("uTideHeight");
  });

  it("keeps animated white crest lines visible on the classic 2D ocean", () => {
    const terrain = readFileSync(
      "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
      "utf8",
    );
    expect(terrain).toContain("oceanCrest");
    expect(terrain).toContain("shoreFoam");
    expect(terrain).toContain("vec3(0.78, 0.94, 1.0)");
  });
});
