import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Random placement, direction, speed, curvature and lifespan are calculated
 * once per frame on the CPU. The fragment shader receives four finished paths
 * and only measures a pixel against them; it must never rebuild random/noise
 * fields per water pixel.
 */
const source = readFileSync(
  resolve(
    process.cwd(),
    "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
  ),
  "utf8",
);

describe("finite coastal flows keep random work off the GPU", () => {
  it("has one finite-path function with no per-pixel noise", () => {
    expect(source).toContain("float coastFlowLayer(");
    const body = source
      .slice(source.indexOf("float coastFlowLayer("))
      .split("\n}")[0];
    expect(body).not.toContain("valueNoise(");
    expect(body).not.toContain("hash21(");
    expect(body).not.toContain("uTime");
  });

  it("bounds every flow in length, width, and lifespan", () => {
    expect(source).toContain("abs(side - curvedCenter) / width");
    expect(source).toContain(
      "smoothstep(halfLength * 0.62, halfLength, abs(along))",
    );
    expect(source).toContain("return ribbonTerm * endFade * life;");
  });

  it("draws exactly four paths", () => {
    expect(source.split("coastFlowLayer(").length - 1).toBe(5);
  });

  it("leaves the always-visible shine layers alone", () => {
    // Those four are read across their whole range, so there is no threshold
    // to bail out on and they must keep calling the full shineLayer.
    expect(source).toContain("float shineLayer(");
    // One declaration plus the four call sites that still use it.
    expect(source.split("shineLayer(").length - 1).toBeGreaterThanOrEqual(5);
  });
});
