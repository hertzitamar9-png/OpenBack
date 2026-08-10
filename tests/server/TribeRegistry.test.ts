// @vitest-environment node

import { describe, expect, test } from "vitest";
import { TribeRegistry } from "../../src/server/auth/TribeRegistry";

describe("TribeRegistry", () => {
  test("normalizes unique names and rejects inappropriate names", () => {
    const registry = new TribeRegistry();
    const first = registry.purchase("owner-a", "  Air   Command  ", "10", 1000);
    expect(first.displayName).toBe("Air Command");
    expect(() =>
      registry.purchase("owner-b", "air command", "10", 1001),
    ).toThrow("duplicate");
    expect(() => registry.purchase("owner-b", "n.a.z.i", "10", 1002)).toThrow(
      "inappropriate",
    );
  });

  test("persists ownership and stacks active boosts", () => {
    const registry = new TribeRegistry();
    const tribe = registry.purchase("owner-a", "Sky Guard", "200", 1000);
    const first = registry.boost(tribe.id, "boost-1", "50", 30, 2000);
    registry.boost(tribe.id, "boost-2", "50", 30, 3000);

    expect(first.expiresAt).toBe(
      new Date(2000 + 30 * 86_400_000).toISOString(),
    );
    expect(registry.listOwned("owner-a", 4000)[0]).toMatchObject({
      displayName: "Sky Guard",
      activeBoosts: 2,
    });

    const restored = new TribeRegistry(registry.serialize());
    expect(restored.listOwned("owner-a", 4000)[0].activeBoosts).toBe(2);
  });

  test("records each game once and serves public and leaderboard statistics", () => {
    const registry = new TribeRegistry();
    const tribe = registry.purchase("owner-a", "Iron Coast", "200", 1000);
    registry.recordGame("game-1", [tribe.displayName], 12, 2000);
    registry.recordGame("game-1", [tribe.displayName], 12, 2000);
    registry.recordGame("game-2", [tribe.displayName], 8, 3000);

    const owner = { publicId: "owner-a", username: "Owner" };
    expect(registry.stats("iron coast", owner, 4000)).toMatchObject({
      name: "Iron Coast",
      lifetime: { gamesAppeared: 2, playerReach: 20 },
      window: { gamesAppeared: 2, playerReach: 20 },
    });
    expect(registry.leaderboard(() => owner, 1, 4000).tribes[0]).toMatchObject({
      rank: 1,
      name: "Iron Coast",
      gamesAppeared: 2,
      playerReach: 20,
      ownerPublicId: "owner-a",
      ownerUsername: "Owner",
    });
  });

  test("builds a boost-weighted multiplayer pool with lobby owners first", () => {
    const registry = new TribeRegistry();
    registry.purchase("owner-a", "Home Guard", "200", 1000);
    const global = registry.purchase("owner-b", "World Guard", "200", 1001);
    registry.boost(global.id, "boost-1", "50", 30, 2000);

    const pool = registry.pool(["owner-a"], 3000);
    expect(pool[0]).toMatchObject({ name: "Home Guard" });
    expect(pool.some((item) => item.name === "World Guard")).toBe(true);
    expect(pool.find((item) => item.name === "World Guard")).toMatchObject({
      customTribeNameId: global.id,
      ownerPublicId: "owner-b",
    });
  });
});
