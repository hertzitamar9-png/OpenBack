import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isExperienceMismatch } from "../../src/core/ExperienceMode";
import {
  ClientJoinMessageSchema,
  GameInfoSchema,
  PublicGameInfoSchema,
} from "../../src/core/Schemas";

describe("Twin World lobby isolation", () => {
  it("advertises a normalized experience on game and public lobby info", () => {
    expect(GameInfoSchema.shape.experienceMode).toBeDefined();
    expect(PublicGameInfoSchema.shape.experienceMode).toBeDefined();
  });

  it("accepts a requested experience on first-join messages", () => {
    const result = ClientJoinMessageSchema.safeParse({
      type: "join",
      token: "00000000-0000-4000-8000-000000000000",
      gameID: "abcdefgh",
      username: "player",
      clanTag: null,
      turnstileToken: null,
      requestedExperienceMode: "3d",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestedExperienceMode).toBe("3d");
    }
  });

  it("rejects only explicit cross-experience joins", () => {
    expect(isExperienceMismatch("3d", "2d")).toBe(true);
    expect(isExperienceMismatch("3d", "3d")).toBe(false);
    expect(isExperienceMismatch("2d", undefined)).toBe(false);
  });

  it("enforces the check before a worker accepts the join", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/server/Worker.ts"),
      "utf8",
    );
    expect(source).toContain("isExperienceMismatch(");
    expect(source).toContain('error: "experience_mismatch"');
  });
});
