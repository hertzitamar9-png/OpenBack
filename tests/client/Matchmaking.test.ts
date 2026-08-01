import { afterEach, describe, expect, it, vi } from "vitest";
import { MatchmakingModal } from "../../src/client/Matchmaking";

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("MatchmakingModal", () => {
  it("cannot be cancelled by clicking the backdrop or pressing Escape", () => {
    const modal = new MatchmakingModal();
    expect(modal.confirmBeforeClose()).toBe(false);
  });

  it("shows party creation instead of searching when friends mode has no party", async () => {
    const modal = new MatchmakingModal();
    Object.assign(modal, {
      isModalOpen: true,
      connected: true,
      teamSize: 2,
      withFriends: true,
      party: null,
      elo: 0,
    });
    document.body.append(modal);
    await modal.updateComplete;

    expect(modal.textContent).toContain("matchmaking_modal.creating_party");
    expect(modal.textContent).not.toContain("matchmaking_modal.searching");
  });

  it("keeps ranked matchmaking disabled until every friend slot is filled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ results: [], total: 0 }),
      }),
    );
    const modal = new MatchmakingModal();
    Object.assign(modal, {
      isModalOpen: true,
      connected: true,
      teamSize: 2,
      withFriends: true,
      myPublicId: "leader",
      elo: 0,
      party: {
        code: "A1B2C3",
        teamSize: 2,
        leaderPublicId: "leader",
        queued: false,
        members: [{ publicId: "leader", displayName: "Leader", elo: 0 }],
      },
    });
    document.body.append(modal);
    await modal.updateComplete;

    const action = modal.querySelector("o-button");
    expect(action).not.toBeNull();
    await (action as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;
    expect(action!.querySelector("button")?.disabled).toBe(true);
    expect(modal.textContent).toContain("matchmaking_modal.party_not_full");
    expect(modal.querySelector("friend-invite-panel")).not.toBeNull();
  });
});
