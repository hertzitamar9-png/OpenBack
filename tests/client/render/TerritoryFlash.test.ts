import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("leaderboard territory focus", () => {
  it("requests a three-second territory flash when a leaderboard row is used", () => {
    expect(source("src/client/InputHandler.ts")).toContain(
      "export class TerritoryFlashEvent",
    );
    expect(source("src/client/hud/layers/PlayerStats.ts")).toContain(
      "new TerritoryFlashEvent(player.smallID(), 3000)",
    );
    expect(source("src/client/hud/layers/PlayerStats.ts")).toContain(
      "new GoToPlayerEvent(player, 6)",
    );
  });

  it("supports the same owner-outline pulse in 2D and 3D shaders", () => {
    expect(
      source("src/client/render/gl/shaders/day-night/border-stamp.frag.glsl"),
    ).toContain("uFlashOwner");
    const threeD = source("src/client/render/gl/passes/ThreeDCompositePass.ts");
    expect(threeD).toContain("uFlashOwner");
    expect(threeD).toContain("uniform sampler2D uBorderTex");
    expect(threeD).toContain("borderType>0.25");
  });
});
