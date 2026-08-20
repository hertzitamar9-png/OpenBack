import { describe, expect, it } from "vitest";
import { RankedType } from "../../src/core/game/Game";
import {
  DEFAULT_RATING,
  migrateExperienceRankings,
  rankingFor,
} from "../../src/server/auth/ExperienceRankings";

describe("Twin World rating migration", () => {
  it("maps legacy rating data only into the classic 1v1 ladder", () => {
    const rankings = migrateExperienceRankings({ elo: 812, peakElo: 900 });
    expect(rankings["2d"]?.[RankedType.OneVOne]).toEqual({
      elo: 812,
      peakElo: 900,
      wins: 0,
      losses: 0,
    });
    expect(rankingFor(rankings, "3d", RankedType.OneVOne).elo).toBe(
      DEFAULT_RATING,
    );
  });

  it("is idempotent and keeps every experience/team ladder independent", () => {
    const first = migrateExperienceRankings({ elo: 500, peakElo: 700 });
    rankingFor(first, "3d", RankedType.FourVFour).elo = 125;
    const second = migrateExperienceRankings({
      elo: 500,
      peakElo: 700,
      rankings: first,
    });

    expect(second).toEqual(first);
    expect(rankingFor(second, "2d", RankedType.OneVOne).elo).toBe(500);
    expect(rankingFor(second, "3d", RankedType.FourVFour).elo).toBe(125);
  });
});
