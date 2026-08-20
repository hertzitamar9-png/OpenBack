import { describe, expect, it } from "vitest";
import { Config } from "../../src/core/configuration/Config";
import { canonicalizeExperienceConfig } from "../../src/core/ExperienceMode";
import { GameConfigSchema } from "../../src/core/Schemas";

const base = {
  gameMap: "World",
  difficulty: "Medium",
  donateGold: true,
  donateTroops: true,
  gameType: "Singleplayer",
  gameMode: "Free For All",
  gameMapSize: "Normal",
  nations: "default",
  bots: 0,
  infiniteGold: false,
  infiniteTroops: false,
  instantBuild: false,
  randomSpawn: false,
} as const;

describe("Twin World replay and protocol compatibility", () => {
  it.each([
    ["old 2D", {}, "2d"],
    ["old 3D", { worldMechanics: { threeDMode: true } }, "3d"],
    ["new 2D", { experienceMode: "2d" }, "2d"],
    ["new 3D", { experienceMode: "3d" }, "3d"],
  ] as const)("loads %s records as %s", (_label, fields, expected) => {
    const parsed = GameConfigSchema.parse({ ...base, ...fields });
    expect(new Config(parsed, null, true).experienceMode()).toBe(expected);
  });

  it("canonicalizes a legacy record without writing the legacy field", () => {
    const legacy = GameConfigSchema.parse({
      ...base,
      worldMechanics: { threeDMode: true, naturalDisasters: true },
    });
    const canonical = canonicalizeExperienceConfig(legacy);

    expect(canonical.experienceMode).toBe("3d");
    expect(canonical.worldMechanics).toEqual({ naturalDisasters: true });
    expect(JSON.stringify(canonical)).not.toContain("threeDMode");
  });

  it("gives an explicit top-level mode precedence over legacy data", () => {
    const mixed = GameConfigSchema.parse({
      ...base,
      experienceMode: "2d",
      worldMechanics: { threeDMode: true },
    });

    expect(canonicalizeExperienceConfig(mixed).experienceMode).toBe("2d");
  });
});
