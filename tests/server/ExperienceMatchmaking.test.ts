import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rankedQueueKey } from "../../src/server/MatchmakingService";

describe("Twin World matchmaking isolation", () => {
  it("builds distinct queue keys for every experience and team size", () => {
    expect(rankedQueueKey("2d", 1)).toBe("2d:1v1");
    expect(rankedQueueKey("3d", 1)).toBe("3d:1v1");
    expect(rankedQueueKey("3d", 4)).toBe("3d:4v4");
  });

  it("requires queue comparisons to include experience mode", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/server/MatchmakingService.ts"),
      "utf8",
    );
    expect(source).toContain("group.experienceMode !== oldest.experienceMode");
    expect(source).toContain(
      'party.experienceMode !== (player.experienceMode ?? "2d")',
    );
  });

  it("sends the selected experience to workers and assigned clients", () => {
    const worker = readFileSync(
      resolve(process.cwd(), "src/server/Worker.ts"),
      "utf8",
    );
    const client = readFileSync(
      resolve(process.cwd(), "src/client/Matchmaking.ts"),
      "utf8",
    );
    expect(worker).toContain("experienceMode,");
    expect(client).toContain("experienceMode: this.experienceMode");
    expect(client).toContain("expectedExperienceMode: this.experienceMode");
  });
});
