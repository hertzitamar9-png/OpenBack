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

  it("anchors ships to the water plane instead of terrain", () => {
    expect(source).toContain("water: 1");
    expect(source).toContain('SURFACE[model.surface ?? "ground"]');
    expect(source).toContain("surface==1?-0.08:smoothHeight(iAnchor)");
  });
});
