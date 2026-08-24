import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The open-water glare was half the terrain shader's cost for an effect that
 * is almost always invisible.
 *
 * Measured on a desktop GPU at 1080p, all-water worst case: the whole shader
 * ran in 0.138ms against 0.012ms for a bare texture fetch, and dropping the
 * four glare layers took it to 0.075ms -- 46% of the pass for a highlight
 * gated behind smoothstep(0.992, 0.9998, ...) and then mixed at 0.08 opacity.
 *
 * It is not removed, because that would change how the sea looks. Instead each
 * layer's value is the product of a wave term and a noise gate, both in
 * [0, 1]: if the wave term alone cannot clear the threshold, neither can the
 * product, and the caller's smoothstep returns zero either way. So the gate --
 * four hash lookups, the expensive half -- is skipped. The wave term clears
 * 0.992 for 20.6% of the phase, so roughly four fifths of pixels skip it.
 *
 * Measured after: 43.8% off the terrain pass, with 36 of 16.8 million channel
 * samples differing by 1/255 from boundary rounding and nothing more.
 */
const source = readFileSync(
  resolve(
    process.cwd(),
    "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
  ),
  "utf8",
);

describe("the open-water glare skips work it cannot show", () => {
  it("has a dedicated layer that can bail out early", () => {
    expect(source).toContain("float glareLayer(");
    expect(source).toContain("if (waveTerm <= threshold) return 0.0;");
  });

  it("computes the cheap wave before the expensive gate", () => {
    const body = source.slice(source.indexOf("float glareLayer("));
    const bail = body.indexOf("if (waveTerm <= threshold)");
    const noise = body.indexOf("valueNoise(");
    expect(bail).toBeGreaterThan(-1);
    expect(noise).toBeGreaterThan(bail);
  });

  it("uses one shared threshold for the skip and the smoothstep", () => {
    // If these two drift apart the skip starts discarding visible glare, so
    // they are the same named constant rather than two loose literals.
    expect(source).toContain("const float GLARE_MIN = 0.992;");
    const calls =
      source.split("smoothstep(GLARE_MIN, 0.9998, glareLayer(").length - 1;
    expect(calls).toBe(4);
    expect(source).not.toContain("smoothstep(0.992, 0.9998,");
  });

  it("leaves the always-visible shine layers alone", () => {
    // Those four are read across their whole range, so there is no threshold
    // to bail out on and they must keep calling the full shineLayer.
    expect(source).toContain("float shineLayer(");
    // One declaration plus the four call sites that still use it.
    expect(source.split("shineLayer(").length - 1).toBeGreaterThanOrEqual(5);
  });
});
