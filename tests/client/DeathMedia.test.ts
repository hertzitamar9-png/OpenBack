import { beforeEach, describe, expect, it, vi } from "vitest";

const linkedAccount = (seen: boolean) =>
  ({
    user: { email: "player@example.com", deathTutorialSeen: seen },
    player: {
      publicId: "p1",
      adfree: false,
      unlimitedRanked: true,
      canCreatePublicLobbies: true,
      achievements: { singleplayerMap: [] },
      friends: [],
      subscription: null,
    },
  }) as const;

describe("death media selection", () => {
  beforeEach(() => vi.resetModules());

  it("shows the tutorial once for a signed-in account then persists the flag", async () => {
    const markSeen = vi.fn(async () => true);
    const { selectDeathMedia } = await import("../../src/client/DeathMedia");
    await expect(
      selectDeathMedia(linkedAccount(false), markSeen),
    ).resolves.toBe("tutorial");
    expect(markSeen).toHaveBeenCalledOnce();
    await expect(
      selectDeathMedia(linkedAccount(false), markSeen),
    ).resolves.toBe("battle");
    await expect(selectDeathMedia(linkedAccount(true), markSeen)).resolves.toBe(
      "battle",
    );
  });

  it("shows the tutorial once per open page for a guest", async () => {
    const { selectDeathMedia } = await import("../../src/client/DeathMedia");
    const markSeen = vi.fn(async () => false);
    await expect(selectDeathMedia(false, markSeen)).resolves.toBe("tutorial");
    await expect(selectDeathMedia(false, markSeen)).resolves.toBe("battle");
    expect(markSeen).not.toHaveBeenCalled();
  });

  it("resets the guest tutorial only when the page module is reloaded", async () => {
    const firstPage = await import("../../src/client/DeathMedia");
    await firstPage.selectDeathMedia(false, async () => false);
    await expect(
      firstPage.selectDeathMedia(false, async () => false),
    ).resolves.toBe("battle");

    vi.resetModules();
    const nextPage = await import("../../src/client/DeathMedia");
    await expect(
      nextPage.selectDeathMedia(false, async () => false),
    ).resolves.toBe("tutorial");
  });
});
