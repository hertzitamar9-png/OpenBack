import { describe, expect, test } from "vitest";
import { GameEnv } from "../../src/core/configuration/Config";
import { requireDurableAuthStorage } from "../../src/server/auth/AuthPersistence";

describe("requireDurableAuthStorage", () => {
  test("allows the local file fallback during development", () => {
    expect(() =>
      requireDurableAuthStorage(GameEnv.Dev, undefined),
    ).not.toThrow();
  });

  test("rejects temporary storage on a hosted runtime even when mislabeled dev", () => {
    expect(() =>
      requireDurableAuthStorage(GameEnv.Dev, undefined, true),
    ).toThrow(/DATABASE_URL is required/);
    expect(() =>
      requireDurableAuthStorage(GameEnv.Dev, "postgresql://db/openback", true),
    ).not.toThrow();
  });

  test.each([GameEnv.Preprod, GameEnv.Prod])(
    "rejects ephemeral storage in deployed environment %s",
    (gameEnv) => {
      expect(() => requireDurableAuthStorage(gameEnv, undefined)).toThrow(
        /DATABASE_URL is required/,
      );
      expect(() => requireDurableAuthStorage(gameEnv, "   ")).toThrow(
        /ephemeral \/tmp storage/,
      );
    },
  );

  test.each([GameEnv.Preprod, GameEnv.Prod])(
    "accepts PostgreSQL in deployed environment %s",
    (gameEnv) => {
      expect(() =>
        requireDurableAuthStorage(gameEnv, "postgresql://db/openback"),
      ).not.toThrow();
    },
  );
});
