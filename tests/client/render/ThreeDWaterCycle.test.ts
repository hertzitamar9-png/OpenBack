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

  it("keeps directional tide shimmer without repeated oval foam on the classic 2D ocean", () => {
    const terrain = readFileSync(
      "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
      "utf8",
    );
    expect(terrain).toContain("openCrest");
    expect(terrain).toContain("coastalBreak");
    expect(terrain).toContain("shimmer");
    expect(terrain).not.toContain("oceanCrest");
    // The drifting pale ovals came from thresholding a sum of three sines:
    // sine interference peaks in round patches. A single directional band is
    // used instead, so this term must not come back.
    expect(terrain).not.toContain("crestWave");
    // Open water carries no crest caps: a directional band read as diagonal
    // stripes across the ocean at map scale.
    expect(terrain).not.toContain("openBreak");
    // Open water must keep moving when the map is zoomed out; the shared
    // `detail` term fades to zero at low zoom and left whole oceans flat.
    expect(terrain).toContain("seaDetail");
    expect(terrain).not.toContain("smoothstep(0.82, 0.97, waves)");
  });
});
