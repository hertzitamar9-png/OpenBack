/**
 * One account, any number of devices, one match.
 */
import { describe, expect, it } from "vitest";
import { ServerMessageSchema } from "../src/core/Schemas";
import {
  createInMemoryActiveMatchRegistry,
  planMatchClaim,
} from "../src/server/ActiveMatchRegistry";

const ACCOUNT = "account-abc";
const OTHER = "account-xyz";

describe("deciding what a join does about an existing claim", () => {
  it("lets a free account join anything", () => {
    expect(planMatchClaim({ requestedGameId: "g1", existing: null })).toEqual({
      action: "claim",
    });
  });

  it("lets another device into the match the account is already in", () => {
    // This is the case that must NOT be treated as a conflict: the second
    // device is joining the same game, which the game's reconnect path seats
    // as the player already there.
    expect(
      planMatchClaim({
        requestedGameId: "g1",
        existing: { gameId: "g1", workerId: 0 },
      }),
    ).toEqual({ action: "claim" });
  });

  it("sends a device aimed at a second match to the first one", () => {
    expect(
      planMatchClaim({
        requestedGameId: "g2",
        existing: { gameId: "g1", workerId: 3 },
      }),
    ).toEqual({ action: "redirect", gameId: "g1" });
  });
});

describe("the claim registry", () => {
  it("reports nothing for an account that is not playing", async () => {
    const r = createInMemoryActiveMatchRegistry();
    expect(await r.activeMatch(ACCOUNT)).toBeNull();
  });

  it("remembers the match an account is bound to", async () => {
    const r = createInMemoryActiveMatchRegistry();
    await r.claimMatch(ACCOUNT, "g1", 2);
    expect(await r.activeMatch(ACCOUNT)).toEqual({ gameId: "g1", workerId: 2 });
  });

  it("keeps accounts independent of each other", async () => {
    const r = createInMemoryActiveMatchRegistry();
    await r.claimMatch(ACCOUNT, "g1", 0);
    await r.claimMatch(OTHER, "g2", 1);
    expect(await r.activeMatch(ACCOUNT)).toEqual({ gameId: "g1", workerId: 0 });
    expect(await r.activeMatch(OTHER)).toEqual({ gameId: "g2", workerId: 1 });
  });

  it("moves the account when it legitimately joins a later match", async () => {
    const r = createInMemoryActiveMatchRegistry();
    await r.claimMatch(ACCOUNT, "g1", 0);
    await r.claimMatch(ACCOUNT, "g2", 1);
    expect(await r.activeMatch(ACCOUNT)).toEqual({ gameId: "g2", workerId: 1 });
  });

  it("frees everyone in a game when that game ends", async () => {
    const r = createInMemoryActiveMatchRegistry();
    await r.claimMatch(ACCOUNT, "g1", 0);
    await r.claimMatch(OTHER, "g1", 0);
    await r.releaseGame("g1");
    expect(await r.activeMatch(ACCOUNT)).toBeNull();
    expect(await r.activeMatch(OTHER)).toBeNull();
  });

  it("leaves other games alone when one ends", async () => {
    const r = createInMemoryActiveMatchRegistry();
    await r.claimMatch(ACCOUNT, "g1", 0);
    await r.claimMatch(OTHER, "g2", 0);
    await r.releaseGame("g1");
    expect(await r.activeMatch(ACCOUNT)).toBeNull();
    expect(await r.activeMatch(OTHER)).toEqual({ gameId: "g2", workerId: 0 });
  });

  it("clears a worker's claims without touching another worker's", async () => {
    // A crash or deploy restart would otherwise strand these claims and lock
    // those accounts out of every future match.
    const r = createInMemoryActiveMatchRegistry();
    await r.claimMatch(ACCOUNT, "g1", 0);
    await r.claimMatch(OTHER, "g2", 1);
    await r.releaseWorker(0);
    expect(await r.activeMatch(ACCOUNT)).toBeNull();
    expect(await r.activeMatch(OTHER)).toEqual({ gameId: "g2", workerId: 1 });
  });
});

describe("the wire message that redirects a device", () => {
  it("parses as a server message", () => {
    const parsed = ServerMessageSchema.safeParse({
      type: "active_match",
      gameID: "abcd1234",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires the game to go to", () => {
    expect(
      ServerMessageSchema.safeParse({ type: "active_match" }).success,
    ).toBe(false);
  });
});
