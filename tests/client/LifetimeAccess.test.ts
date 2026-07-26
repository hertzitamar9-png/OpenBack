import { describe, expect, it } from "vitest";
import { hasLifetimeAccess } from "../../src/client/LifetimeAccess";

describe("lifetime access", () => {
  it("does not treat guests or ordinary accounts as paid", () => {
    expect(hasLifetimeAccess(false)).toBe(false);
    expect(
      hasLifetimeAccess({
        user: { email: "player@example.com" },
        player: {
          publicId: "player",
          adfree: false,
          achievements: { singleplayerMap: [] },
          friends: [],
          lifetimeAccess: false,
          subscription: null,
        },
      }),
    ).toBe(false);
  });

  it("recognizes the server-issued lifetime entitlement", () => {
    expect(
      hasLifetimeAccess({
        user: { email: "owner@example.com" },
        player: {
          publicId: "owner",
          adfree: false,
          achievements: { singleplayerMap: [] },
          friends: [],
          lifetimeAccess: true,
          subscription: null,
        },
      }),
    ).toBe(true);
  });
});
