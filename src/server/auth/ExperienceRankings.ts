import type { ExperienceMode } from "../../core/Schemas";
import { RankedType } from "../../core/game/Game";

export const DEFAULT_RATING = 0;

export interface RankingBucket {
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
}

export type ExperienceRankings = Partial<
  Record<ExperienceMode, Partial<Record<RankedType, RankingBucket>>>
>;

export interface LegacyRankingData {
  elo?: number;
  peakElo?: number;
  rankedWins?: number;
  rankedLosses?: number;
  rankings?: ExperienceRankings;
}

export function migrateExperienceRankings(
  user: LegacyRankingData,
): ExperienceRankings {
  if (user.rankings !== undefined) return user.rankings;
  if (
    user.elo === undefined &&
    user.peakElo === undefined &&
    user.rankedWins === undefined &&
    user.rankedLosses === undefined
  ) {
    return {};
  }
  const elo = user.elo ?? DEFAULT_RATING;
  return {
    "2d": {
      [RankedType.OneVOne]: {
        elo,
        peakElo: user.peakElo ?? elo,
        wins: user.rankedWins ?? 0,
        losses: user.rankedLosses ?? 0,
      },
    },
  };
}

export function rankingFor(
  rankings: ExperienceRankings,
  experienceMode: ExperienceMode,
  rankedType: RankedType,
): RankingBucket {
  const experience = (rankings[experienceMode] ??= {});
  return (experience[rankedType] ??= {
    elo: DEFAULT_RATING,
    peakElo: DEFAULT_RATING,
    wins: 0,
    losses: 0,
  });
}
