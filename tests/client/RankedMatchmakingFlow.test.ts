import { describe, expect, it } from "vitest";
import {
  canQueueRankedFriendParty,
  rankedMatchmakingFlow,
  shouldCreateRankedParty,
  shouldJoinRankedQueue,
} from "../../src/client/RankedMatchmakingFlow";

describe("ranked matchmaking flow", () => {
  it("preserves the friend-party choice without putting the player in queue", () => {
    const flow = rankedMatchmakingFlow({ teamSize: 2, withFriends: true });

    expect(flow).toEqual({
      teamSize: 2,
      partyCode: "",
      withFriends: true,
      partyMembers: [],
    });
    expect(shouldJoinRankedQueue(flow)).toBe(false);
    expect(shouldCreateRankedParty(flow)).toBe(true);
  });

  it("joins an invited party instead of creating or directly queueing", () => {
    const flow = rankedMatchmakingFlow({
      teamSize: 4,
      partyCode: " a1b2c3 ",
    });

    expect(flow.partyCode).toBe("A1B2C3");
    expect(flow.withFriends).toBe(true);
    expect(shouldJoinRankedQueue(flow)).toBe(false);
    expect(shouldCreateRankedParty(flow)).toBe(false);
  });

  it("keeps ordinary team matchmaking as a direct queue", () => {
    const flow = rankedMatchmakingFlow({ teamSize: 3 });

    expect(flow.withFriends).toBe(false);
    expect(shouldJoinRankedQueue(flow)).toBe(true);
  });

  it("does not allow a friend-party mode for 1v1", () => {
    const flow = rankedMatchmakingFlow({ teamSize: 1, withFriends: true });

    expect(flow.withFriends).toBe(false);
    expect(shouldJoinRankedQueue(flow)).toBe(true);
  });

  it("requires a multi-player friend party led by the current player", () => {
    const party = {
      teamSize: 2 as const,
      leaderPublicId: "leader",
      members: [{ publicId: "leader" }],
    };

    expect(canQueueRankedFriendParty(party, "leader")).toBe(false);
    party.members.push({ publicId: "friend" });
    expect(canQueueRankedFriendParty(party, "leader")).toBe(true);
    expect(canQueueRankedFriendParty(party, "friend")).toBe(false);
  });
});
