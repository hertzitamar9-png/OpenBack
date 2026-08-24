import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Each pixel evaluates only the shimmer assigned to its broad spatial cell.
 * Adding coverage across the whole ocean must not become a loop over every
 * shimmer on the map.
 */
const source = readFileSync(
  resolve(
    process.cwd(),
    "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
  ),
  "utf8",
);

describe("distributed coastal flows keep bounded GPU cost", () => {
  it("has one finite-path calculation and no global shimmer loop", () => {
    expect(source).toContain("float coastFlowLayer(");
    expect(source).toContain("float oceanShimmer(");
    expect(source.match(/coastFlowLayer\(/g)).toHaveLength(2);
    expect(source).not.toMatch(/for\s*\([^)]*shimmer/i);
  });

  it("bounds every flow in length, width, and lifespan", () => {
    expect(source).toContain("abs(side - curvedCenter) / width");
    expect(source).toContain(
      "smoothstep(halfLength * 0.62, halfLength, abs(along))",
    );
    expect(source).toContain("return ribbonTerm * endFade * life;");
  });

  it("selects one region directly from world position", () => {
    expect(source).toContain("vec2 cell = floor(world / cellSize);");
    expect(source).toContain(
      "float waterFlow = oceanShimmer(world, uMapSize, uTime, uZoom);",
    );
  });

  it("leaves the always-visible shine layers alone", () => {
    // Those four are read across their whole range, so there is no threshold
    // to bail out on and they must keep calling the full shineLayer.
    expect(source).toContain("float shineLayer(");
    // One declaration plus the four call sites that still use it.
    expect(source.split("shineLayer(").length - 1).toBeGreaterThanOrEqual(5);
  });
});
