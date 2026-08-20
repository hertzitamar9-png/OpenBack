import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { applyExperienceMode } from "../../src/core/ExperienceMode";

describe("Twin World setup configuration", () => {
  it.each(["2d", "3d"] as const)(
    "writes %s at the top level and strips the legacy modifier",
    (experienceMode) => {
      const config = applyExperienceMode(
        {
          gameMap: "World",
          worldMechanics: {
            fogOfWar: true,
            threeDMode: experienceMode === "3d",
          },
        },
        experienceMode,
      );

      expect(config.experienceMode).toBe(experienceMode);
      expect(config.worldMechanics).toEqual({ fogOfWar: true });
      expect(JSON.stringify(config)).not.toContain("threeDMode");
    },
  );

  it.each([
    "src/client/SinglePlayerModal.ts",
    "src/client/HostLobbyModal.ts",
    "src/server/MapPlaylist.ts",
  ])("does not serialize threeDMode in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/threeDMode\s*:/);
    expect(source).toContain("experienceMode");
  });
});
