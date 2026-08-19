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
    // Open water carries travelling shiny streaks, not the zeroed crest
    // placeholder that stood here while the sea had no light of its own.
    expect(terrain).toContain("openStreak");
    expect(terrain).toContain("valueNoise");
    expect(terrain).not.toContain("openCrest");
    // They apply to all water, not gated on the shore flag — that gating was
    // the reason the open ocean read as flat.
    expect(terrain).not.toMatch(/shore\s*\?[^;]*openStreak/);
    // Four populations with different headings and speeds, so the surface
    // never drifts as one sheet in a single direction, and each streak is
    // broken into segments so the pattern cannot resolve into stripes.
    expect(terrain).toContain("streakLayer");
    // Compare on whitespace-normalised text so the assertion does not depend
    // on how the call is wrapped.
    const flat = terrain.replace(/\s+/g, " ");
    const headings = [
      ...flat.matchAll(/streakLayer\( world, vec2\(([-\d.]+), ([-\d.]+)\)/g),
    ];
    expect(headings.length).toBeGreaterThanOrEqual(3);
    expect(headings.some(([, x]) => Number(x) > 0)).toBe(true);
    expect(headings.some(([, x]) => Number(x) < 0)).toBe(true);
    expect(headings.some(([, , y]) => Number(y) > 0)).toBe(true);
    expect(headings.some(([, , y]) => Number(y) < 0)).toBe(true);
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
