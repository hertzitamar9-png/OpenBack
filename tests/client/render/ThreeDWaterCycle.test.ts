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
    // The open sea carries the same pale shallow-water shine that makes a
    // coastline glow, rather than the zeroed crest placeholder that stood
    // here while the sea had no light of its own.
    expect(terrain).toContain("shineTint");
    expect(terrain).not.toContain("openCrest");
    // Soft-edged and summed, never thresholded into bands: a hard cut is what
    // turned earlier attempts into stripes and then into scratches.
    expect(terrain).not.toContain("streakLayer");
    // A wide smoothstep is what keeps the edges soft; a narrow one would
    // cut the light back into bands.
    expect(terrain).toContain("smoothstep(0.35, 0.95, shine)");
    // It applies to all water, not gated on the shore flag — that gating was
    // the reason the open ocean read as dead next to the coast.
    expect(terrain).not.toMatch(/shore\s*\?[^;]*shineTint/);
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
