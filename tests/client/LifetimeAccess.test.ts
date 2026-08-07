import { describe, expect, it } from "vitest";
import { hasLifetimeAccess } from "../../src/client/LifetimeAccess";

describe("open gameplay access", () => {
  it("does not gate guests or ordinary accounts", () => {
    expect(hasLifetimeAccess(false)).toBe(true);
    expect(
      hasLifetimeAccess({
        user: { email: "player@example.com" },
        player: {
          publicId: "player",
          adfree: false,
          unlimitedRanked: false,
          canCreatePublicLobbies: false,
          achievements: { singleplayerMap: [] },
          friends: [],
          lifetimeAccess: false,
          subscription: null,
        },
      }),
    ).toBe(true);
  });

  it("keeps old entitlement responses compatible", () => {
    expect(
      hasLifetimeAccess({
        user: { email: "owner@example.com" },
        player: {
          publicId: "owner",
          adfree: false,
          unlimitedRanked: false,
          canCreatePublicLobbies: false,
          achievements: { singleplayerMap: [] },
          friends: [],
          lifetimeAccess: true,
          subscription: null,
        },
      }),
    ).toBe(true);
  });
});
