import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/client/render/gl/three-d/ThreeDUnitPass.ts"),
  "utf8",
);

describe("3D unit surface parity", () => {
  it("anchors models to the same fixed smoothed surface as terrain", () => {
    expect(source).toContain("float smoothHeight(vec2 world)");
    expect(source).toContain("float r=1.5;");
    expect(source).toContain("smoothHeight(iAnchor)");
  });

  it("anchors ships to the water instead of terrain", () => {
    expect(source).toContain("water: 1");
    expect(source).toContain('SURFACE[model.surface ?? "ground"]');
    expect(source).toContain("smoothHeight(iAnchor)");
  });

  // Ships were pinned to a constant -0.08, just under still water, while the
  // sea itself rose with the tide and stood up in crests several units tall --
  // up to 8.6 units above that hull on a night sea. The water simply climbed
  // over them, which is why they read as drowning rather than floating. They
  // now read their height from the same GLSL the water mesh builds its
  // geometry from, so the two cannot drift apart.
  it("floats ships on the live sea rather than a fixed plane", () => {
    const surface = readFileSync(
      resolve(
        process.cwd(),
        "src/client/render/gl/three-d/ThreeDWaterSurface.ts",
      ),
      "utf8",
    );
    const water = readFileSync(
      resolve(
        process.cwd(),
        "src/client/render/gl/passes/ThreeDCompositePass.ts",
      ),
      "utf8",
    );

    // One definition of the sea, included by both.
    expect(surface).toContain("float waterSurfaceHeight(vec2 p,float phase");
    expect(source).toContain("${THREE_D_WATER_SURFACE_GLSL}");
    expect(water).toContain("${THREE_D_WATER_SURFACE_GLSL}");
    expect(water).toContain("waterSurfaceHeight(vWorld,phase,uTideHeight)");

    // Hulls ride it, less their draft.
    expect(source).toContain("waterSurfaceHeight(iWorld.xz,waterPhase(uTime)");
    expect(source).toContain("uniform float uTideHeight");
    expect(source).toContain("uniform float uWaveStrength");
    // The frozen plane is gone.
    expect(source).not.toContain("surface==1?-0.08");
  });
});
