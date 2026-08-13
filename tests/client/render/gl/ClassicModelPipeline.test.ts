import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("classic model pipeline", () => {
  it("uses the complete original and OpenBack structure artwork", () => {
    const pass = source("src/client/render/gl/passes/StructurePass.ts");
    expect(pass).toContain('assetUrl("atlases/icon-atlas.png")');
    expect(pass).toContain("shaders/structure/structure.frag.glsl?raw");
    expect(pass).toContain("UT_RUNWAY");
    expect(pass).toContain("UT_MANPAD");
    expect(pass).toContain("UT_MILITARY_BASE");
    expect(pass).toContain("UT_TANK_MINE");
  });

  it("uses classic mobile artwork with every train variant and custom vehicle", () => {
    const pass = source("src/client/render/gl/passes/UnitPass.ts");
    const fragment = source("src/client/render/gl/shaders/unit/unit.frag.glsl");
    expect(pass).toContain('assetUrl("atlases/unit-atlas.png")');
    expect(pass).toContain('"TrainEngine"');
    expect(pass).toContain('"TrainCarriage"');
    expect(pass).toContain('"TrainCarriageLoaded"');
    expect(pass).toContain("const PLANE_COL = ATLAS_COLS");
    expect(pass).toContain("const TANK_COL = ATLAS_COLS + 1");
    expect(fragment).toContain("float planeAlpha");
    expect(fragment).toContain("float hull");
  });

  it("keeps nuclear projectiles as bounded sun-like fireballs", () => {
    const fragment = source("src/client/render/gl/shaders/unit/unit.frag.glsl");
    expect(fragment).toContain("nuclearFireball");
    expect(fragment).toContain("nuclearCorona");
    expect(fragment).toContain("nuclearFlames");
  });

  it("draws small-territory glow behind units and structures", () => {
    const renderer = source("src/client/render/gl/Renderer.ts");
    const overlays = renderer.slice(renderer.indexOf("private renderOverlays"));
    expect(overlays.indexOf("smallPlayerGlowPass.draw(cam)")).toBeLessThan(
      overlays.indexOf("unitPass.drawGround(cam)"),
    );
    expect(overlays.indexOf("smallPlayerGlowPass.draw(cam)")).toBeLessThan(
      overlays.indexOf("structurePass.draw(cam, zoom)"),
    );
  });
});
