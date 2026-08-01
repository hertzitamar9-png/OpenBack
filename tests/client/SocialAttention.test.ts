import { describe, expect, it } from "vitest";
import { SocialAttention } from "../../src/client/SocialAttention";
import type { PendingSocialInvite } from "../../src/client/SocialClient";

function invite(id: string): PendingSocialInvite {
  return {
    id,
    from: "friend-id",
    fromName: "Friend",
    to: "my-id",
    createdAt: new Date().toISOString(),
    payload: { kind: "party" },
  };
}

describe("social request attention", () => {
  it("guides an unanswered request from Profile to Friends", () => {
    const attention = new SocialAttention();
    const stages: string[] = [];
    const listener = (event: Event) =>
      stages.push((event as CustomEvent<string>).detail);
    document.addEventListener("social-attention-changed", listener);
    window.currentPageId = "page-play";

    attention.deferInvite("invite-1");
    expect(attention.getStage()).toBe("profile");

    attention.profileOpened();
    expect(attention.getStage()).toBe("friends");

    attention.friendsOpened();
    expect(attention.getStage()).toBe("none");
    expect(stages).toEqual(["profile", "friends", "none"]);

    document.removeEventListener("social-attention-changed", listener);
  });

  it("clears the alert immediately when the request is removed", () => {
    const attention = new SocialAttention();
    window.currentPageId = "page-play";
    attention.deferInvite("invite-1");

    attention.syncInvites([invite("invite-1")]);
    expect(attention.getStage()).toBe("profile");

    attention.syncInvites([]);
    expect(attention.getStage()).toBe("none");
  });

  it("points directly to Friends when Account is already open", () => {
    const attention = new SocialAttention();
    window.currentPageId = "page-account";

    attention.deferInvite("invite-1");

    expect(attention.getStage()).toBe("friends");
  });
});
