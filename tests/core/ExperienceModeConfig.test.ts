import { describe, expect, it } from "vitest";
import {
  ExperienceModeSchema,
  GameConfig,
  GameConfigSchema,
  normalizeExperienceMode,
} from "../../src/core/Schemas";
import { Config } from "../../src/core/configuration/Config";

describe("Twin World experience configuration", () => {
  it.each([
    [{ experienceMode: "2d" }, "2d"],
    [{ experienceMode: "3d" }, "3d"],
    [{ worldMechanics: { threeDMode: true } }, "3d"],
    [{ worldMechanics: { threeDMode: false } }, "2d"],
    [{}, "2d"],
  ] as const)("normalizes %# to %s", (input, expected) => {
    expect(normalizeExperienceMode(input)).toBe(expected);
    expect(new Config(input as GameConfig, null, false).experienceMode()).toBe(
      expected,
    );
  });

  it("accepts only stable 2d and 3d wire values", () => {
    expect(ExperienceModeSchema.parse("2d")).toBe("2d");
    expect(ExperienceModeSchema.parse("3d")).toBe("3d");
    expect(ExperienceModeSchema.safeParse("classic").success).toBe(false);
  });

  it("accepts the new top-level field while retaining legacy parsing", () => {
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
    };

    expect(
      GameConfigSchema.parse({ ...base, experienceMode: "3d" }).experienceMode,
    ).toBe("3d");
    expect(
      GameConfigSchema.parse({
        ...base,
        worldMechanics: { threeDMode: true },
      }).worldMechanics?.threeDMode,
    ).toBe(true);
  });
});
