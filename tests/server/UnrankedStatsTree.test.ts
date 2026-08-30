import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PlayerProfileSchema } from "../../src/core/ApiSchemas";

/**
 * A player's unranked games have to reach the stats panel.
 *
 * The profile returned only ranked rankings, so the "All" view had no source
 * at all and read zero however much someone had played -- thirteen recorded
 * games on the live server showed as none played, no victories, no losses.
 * Every archived game already carries its type, mode, difficulty and outcome.
 */
const server = readFileSync("src/server/auth/AuthServer.ts", "utf8");

describe("unranked stats reach the profile", () => {
  it("builds a tree from the games, not only from rankings", () => {
    expect(server).toContain("function unrankedStatsFor(publicId: string)");
    expect(server).toMatch(
      /stats: \{\s*\n\s*\.\.\.unrankedStatsFor\(target\.publicId\)/,
    );
  });

  it("counts a game towards played, and a win towards wins", () => {
    expect(server).toMatch(/leaf\.total \+= 1;/);
    expect(server).toMatch(
      /if \(game\.result === "victory"\) leaf\.wins \+= 1;/,
    );
    expect(server).toMatch(
      /else if \(game\.result === "defeat"\) leaf\.losses \+= 1;/,
    );
  });

  it("keeps ranked games out of the unranked buckets", () => {
    expect(server).toMatch(
      /if \(game\.rankedType && game\.rankedType !== "unranked"\) continue;/,
    );
  });

  it("records the difficulty a game was played at", () => {
    expect(server).toMatch(/difficulty: config\.difficulty,/);
  });

  it("still counts a game archived before difficulty was recorded", () => {
    // Dropping them would make old games vanish from someone's record.
    expect(server).toMatch(
      /isDifficulty\(game\.difficulty\)[\s\S]{0,80}Difficulty\.Medium/,
    );
  });

  it("produces a shape the profile schema accepts", () => {
    // The wire format carries the counters as strings, and the client parses
    // the whole profile through this schema -- a number here would be dropped.
    const profile = {
      createdAt: new Date().toISOString(),
      publicId: "abc12345",
      displayName: "Someone",
      username: "Someone",
      online: false,
      lastSeenAt: new Date().toISOString(),
      clans: [],
      stats: {
        Public: {
          "Free For All": {
            Medium: {
              wins: "1",
              losses: "2",
              total: "3",
              stats: undefined,
              recent: { games: 3, wins: 1 },
            },
          },
        },
      },
    };
    const parsed = PlayerProfileSchema.safeParse(profile);
    expect(parsed.success).toBe(true);
  });
});
