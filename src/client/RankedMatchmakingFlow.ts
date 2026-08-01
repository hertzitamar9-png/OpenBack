export type RankedTeamSize = 1 | 2 | 3 | 4;

export interface RankedMatchmakingOpenDetail {
  teamSize?: RankedTeamSize;
  partyCode?: string;
  withFriends?: boolean;
  partyMembers?: string[];
}

export interface RankedMatchmakingFlow {
  teamSize: RankedTeamSize;
  partyCode: string;
  withFriends: boolean;
  partyMembers: string[];
}

export interface RankedPartyReadiness {
  teamSize: Exclude<RankedTeamSize, 1>;
  leaderPublicId: string;
  members: Array<{ publicId: string }>;
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
    partyMembers: Array.isArray(detail?.partyMembers)
      ? detail.partyMembers.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export function shouldJoinRankedQueue(flow: RankedMatchmakingFlow): boolean {
  return flow.teamSize === 1 || !flow.withFriends;
}

export function shouldCreateRankedParty(flow: RankedMatchmakingFlow): boolean {
  return flow.teamSize > 1 && flow.withFriends && flow.partyCode.length === 0;
}

export function canQueueRankedFriendParty(
  party: RankedPartyReadiness | null,
  publicId: string,
): boolean {
  return Boolean(
    party &&
    party.leaderPublicId === publicId &&
    party.members.length >= 2 &&
    party.members.length >= 2 &&
    party.members.length <= party.teamSize,
  );
}
