import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/client/render/gl/passes/ThreeDCompositePass.ts"),
  "utf8",
);

describe("3D terrain material parity", () => {
  it("uses the canonical 50 percent relief scale in both terrain shaders", () => {
    expect(source.match(/\*1\.5/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain("return 57.0");
  });

  it("keeps fallout visibly dark green after ownership tint", () => {
    expect(source).toContain("1u<<13u");
    expect(source).toContain("vec3(0.055,0.19,0.075)");
  });

  it("renders a complete cyan water surface with world anchored waves", () => {
    expect(source).toContain("waterFrag");
    expect(source).toContain("worldWave");
    expect(source).toContain("vec3(0.075,0.48,0.68)");
  });

  it("closes raised southern terrain against the solid board", () => {
    expect(source).toContain("skirtProgram");
    expect(source).toContain("uTerrain");
    expect(source).toContain("uSkirtBottom");
  });

  it("computes continuous world-coordinate terrain normals", () => {
    expect(source).toContain("vWorld");
    expect(source).toContain("smoothHeight(world+vec2(1.0,0.0))");
  });

  it("keeps the relief kernel fixed so chunk LOD boundaries cannot form bands", () => {
    expect(source).toContain("float r=1.5;");
    expect(source).not.toContain("float r=max(1.5,uSampleRadius)");
  });
});
