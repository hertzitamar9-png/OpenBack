import { describe, expect, it } from "vitest";
import { CreateGameInputSchema } from "../../src/core/WorkerSchemas";

/**
 * Hosting a multiplayer game in Immersive 3D was impossible.
 *
 * The create-lobby endpoint accepted "a whole GameConfig, or nothing at all".
 * A host has chosen no settings at that point, so the client sent nothing --
 * the game was therefore minted in the default 2D experience, while the same
 * client immediately connected to it asking for 3D. The worker compares the
 * two and closed the socket with `experience_mismatch`, so the host could not
 * enter the lobby they had just created.
 *
 * Reproduced in a running game before the fix, and confirmed after it: the
 * created game reports experienceMode "3d" and the host appears in its client
 * list instead of being rejected.
 */
describe("create game input", () => {
  it("accepts the experience the host is playing in", () => {
    const parsed = CreateGameInputSchema.safeParse({ experienceMode: "3d" });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data?.experienceMode).toBe("3d");
  });

  it("still accepts a body that declares nothing", () => {
    // The old empty-object branch: everything falls back to defaults.
    const parsed = CreateGameInputSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("still accepts a fully specified config", () => {
    const parsed = CreateGameInputSchema.safeParse({
      gameMap: "World",
      gameType: "Private",
      difficulty: "Easy",
      experienceMode: "2d",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data?.experienceMode).toBe("2d");
  });

  it("rejects an experience that is not a real one", () => {
    const parsed = CreateGameInputSchema.safeParse({ experienceMode: "4d" });
    expect(parsed.success).toBe(false);
  });
});
