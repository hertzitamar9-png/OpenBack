import { GameEnv } from "../../core/configuration/Config";

export function requireDurableAuthStorage(
  gameEnv: GameEnv,
  databaseUrl: string | undefined,
  ephemeralHostedRuntime = false,
): void {
  if (gameEnv === GameEnv.Dev && !ephemeralHostedRuntime) return;
  if (databaseUrl?.trim()) return;

  throw new Error(
    "DATABASE_URL is required on hosted deployments and outside development. Refusing to store accounts in ephemeral /tmp storage.",
  );
}
