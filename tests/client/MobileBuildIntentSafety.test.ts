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
    // The tap is snapped to nearby land first, and the attack is abandoned
    // when there is none -- open water must never become a destination.
    expect(runner).toMatch(
      /doBoatAttackUnderCursor\(\)[\s\S]*?this\.landTileForBoat\(pointed\)[\s\S]*?if \(tile === null\) return;/,
    );
    expect(runner).toMatch(
      /sendBoatAttackIntent\(tile: TileRef\)[\s\S]*?!this\.gameView\.isLand\(tile\)/,
    );
  });

  it("only ever snaps a boat target onto land", () => {
    const start = runner.indexOf("private landTileForBoat");
    const end = runner.indexOf("private doBoatAttackUnderCursor", start);
    expect(start).toBeGreaterThan(-1);
    const snap = runner.slice(start, end);
    // Every path out of the search returns a tile it has just proved is land.
    expect(snap).toContain("if (this.gameView.isLand(tile)) return tile;");
    expect(snap).toContain(
      "if (this.gameView.isLand(candidate)) return candidate;",
    );
    expect(snap).toContain("return null;");
  });

  it("keeps the snap tolerance a fixed size on screen, not in tiles", () => {
    // Dividing a pixel radius by the zoom is what makes a tap behave the same
    // however far in or out the map is.
    expect(runner).toMatch(/BOAT_TAP_RADIUS_PX \/ pixelsPerTile/);
    expect(runner).toContain("BOAT_TAP_MAX_SNAP_TILES");
  });

  it("uses the reachable-shore result without an extra click-distance cap", () => {
    const start = runner.indexOf("private canAutoBoat");
    const end = runner.indexOf("private onMouseMove", start);
    const autoBoat = runner.slice(start, end);
    expect(autoBoat).toContain("this.canBoatAttack(buildables) !== false");
    expect(autoBoat).not.toContain("const limit = 100");
  });
});
