export type RankedTeamSize = 1 | 2 | 3 | 4;

export interface RankedMatchmakingOpenDetail {
  teamSize?: RankedTeamSize;
  partyCode?: string;
  withFriends?: boolean;
}

export interface RankedMatchmakingFlow {
  teamSize: RankedTeamSize;
  partyCode: string;
  withFriends: boolean;
}

export function rankedMatchmakingFlow(
  detail?: RankedMatchmakingOpenDetail,
): RankedMatchmakingFlow {
  const teamSize =
    detail?.teamSize === 2 || detail?.teamSize === 3 || detail?.teamSize === 4
      ? detail.teamSize
      : 1;
  const partyCode = detail?.partyCode?.trim().toUpperCase() ?? "";

  return {
    teamSize,
    partyCode,
    withFriends:
      teamSize > 1 && (detail?.withFriends === true || partyCode.length > 0),
  };
}

export function shouldJoinRankedQueue(flow: RankedMatchmakingFlow): boolean {
  return flow.teamSize === 1 || !flow.withFriends;
}

export function shouldCreateRankedParty(flow: RankedMatchmakingFlow): boolean {
  return flow.teamSize > 1 && flow.withFriends && flow.partyCode.length === 0;
}
