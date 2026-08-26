import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile build intent safety", () => {
  const runner = readFileSync("src/client/ClientGameRunner.ts", "utf8");
  const preview = readFileSync(
    "src/client/controllers/BuildPreviewController.ts",
    "utf8",
  );

  it("never converts a build-placement release into an attack", () => {
    expect(runner).toMatch(
      /inputEvent\(event: MouseUpEvent\)[\s\S]*?event\.isBuildPlacement[\s\S]*?return;/,
    );
  });

  it("cancels the selected structure after a confirmed invalid tile", () => {
    expect(preview).toMatch(
      /if \(!unit\)[\s\S]*?pendingConfirm[\s\S]*?removeGhostStructure\(\)/,
    );
  });

  it("also cancels when validation returns a disabled buildable", () => {
    expect(preview).toMatch(
      /if \(this\.pendingConfirm !== null\)[\s\S]*?isGhostReadyForConfirm\(\)[\s\S]*?else \{[\s\S]*?removeGhostStructure\(\)/,
    );
  });

  it("never launches a transport ship from a water target", () => {
    expect(runner).toMatch(
      /doBoatAttackUnderCursor\(\)[\s\S]*?tile === null \|\| !this\.gameView\.isLand\(tile\)/,
    );
    expect(runner).toMatch(
      /sendBoatAttackIntent\(tile: TileRef\)[\s\S]*?!this\.gameView\.isLand\(tile\)/,
    );
  });

  it("uses the reachable-shore result without an extra click-distance cap", () => {
    const start = runner.indexOf("private canAutoBoat");
    const end = runner.indexOf("private onMouseMove", start);
    const autoBoat = runner.slice(start, end);
    expect(autoBoat).toContain("this.canBoatAttack(buildables) !== false");
    expect(autoBoat).not.toContain("const limit = 100");
  });
});
