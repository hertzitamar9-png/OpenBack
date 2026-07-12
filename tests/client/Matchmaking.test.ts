import { describe, expect, it } from "vitest";
import { MatchmakingModal } from "../../src/client/Matchmaking";

describe("MatchmakingModal", () => {
  it("cannot be cancelled by clicking the backdrop or pressing Escape", () => {
    const modal = new MatchmakingModal();
    expect(modal.confirmBeforeClose()).toBe(false);
  });
});
