import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("battlefield asset readiness", () => {
  const runner = readFileSync("src/client/ClientGameRunner.ts", "utf8");
  const unitPass = readFileSync(
    "src/client/render/gl/passes/UnitPass.ts",
    "utf8",
  );
  const structurePass = readFileSync(
    "src/client/render/gl/passes/StructurePass.ts",
    "utf8",
  );
  const renderer = readFileSync("src/client/render/gl/Renderer.ts", "utf8");
  const atlasLoader = readFileSync(
    "src/client/render/gl/passes/BattlefieldAtlasLoader.ts",
    "utf8",
  );
  const threeDUnits = readFileSync(
    "src/client/render/gl/three-d/ThreeDUnitPass.ts",
    "utf8",
  );

  it("preloads unit and structure atlases before the first game frame", () => {
    expect(runner).toContain("preloadBattlefieldAtlases");
    expect(runner).toMatch(
      /await Promise\.all\(\[[\s\S]*atlasDataLoad[\s\S]*battlefieldAtlasesLoad/,
    );
    expect(unitPass).toContain("loadBattlefieldAtlas(unitAtlasUrl)");
    expect(unitPass).toMatch(
      /loadBattlefieldAtlas\(unitAtlasUrl\)[\s\S]*gl\.activeTexture\(gl\.TEXTURE1\)[\s\S]*gl\.bindTexture\(gl\.TEXTURE_2D, this\.atlasTex\)/,
    );
    expect(structurePass).toContain("loadBattlefieldAtlas(iconAtlasUrl)");
    expect(atlasLoader).toMatch(
      /image\.onload\s*=\s*async[\s\S]*await image\.decode\(\)[\s\S]*resolve\(image\)/,
    );
  });

  it("keeps the classic ship visible until its 3D replacement is ready", () => {
    expect(threeDUnits).toContain("loadedModelTypes");
    expect(threeDUnits).toContain("this.loadedModelTypes.add(type)");
    expect(renderer).toContain("setThreeDReadyModelTypes");
    expect(unitPass).toContain("uThreeDModelMask");
    expect(unitPass).toContain("setThreeDReadyModelTypes");
  });
});
