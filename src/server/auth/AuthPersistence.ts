import { GameEnv } from "../../core/configuration/Config";

export function requireDurableAuthStorage(
  gameEnv: GameEnv,
  databaseUrl: string | undefined,
): void {
  if (gameEnv === GameEnv.Dev) return;
  if (databaseUrl?.trim()) return;

  throw new Error(
    "DATABASE_URL is required outside development. Refusing to store accounts in ephemeral /tmp storage.",
  );
}
