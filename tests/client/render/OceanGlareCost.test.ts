import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The open-water glare is the most expensive thing in the terrain shader, and
 * most of that cost buys nothing.
 *
 * Measured on a desktop GPU, 1024x1024, all-water worst case, with every
 * uniform held constant across the timed draws: the pass runs in 0.0557ms,
 * 0.0703ms with the early-out removed, and 0.0385ms with the glare deleted
 * outright. So the glare is 31% of the pass and the early-out takes 21% off
 * it -- for a highlight gated behind smoothstep(GLARE_MIN, 0.9998, ...) that
 * is zero at most pixels most of the time.
 *
 * (An earlier version of this file quoted 46% and 43.8%. Those came from a
 * harness that updated a uniform between draws, which serialises on ANGLE and
 * swamped the fragment cost it was supposed to be measuring. The figures above
 * are from a loop that changes nothing between draws.)
 *
 * The layers are not removed, because that would change how the sea looks.
 * Each layer's value is a wave term times a noise gate, both in [0, 1]: if the
 * wave term alone cannot clear the threshold, neither can the product, and the
 * caller's smoothstep returns zero either way. So the gate -- four hash
 * lookups, the expensive half -- is skipped. The wave term clears 0.992 for
 * 20.6% of its phase, so roughly four fifths of pixels never touch the noise.
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
