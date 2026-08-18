/**
 * One live match per account, across every device and every worker.
 *
 * An account's identity is the JWT subject, which the auth server sets to the
 * user row's persistent id — so it is the same on every device signed into that
 * account. Within a single game that already collapses to one player, because
 * the join path reconnects a known persistent id instead of seating it twice.
 * What that does not cover is a second device joining a *different* game: games
 * are sharded across worker processes by game id, so the worker taking the
 * second join cannot see the first.
 *
 * This is the shared ground they meet on. Postgres is already running for auth
 * and every worker has DATABASE_URL, so a claim written by one worker is
 * immediately visible to all of them.
 *
 * Liveness is handled without heartbeats, deliberately: a disconnect is not a
 * departure — refreshes and dropped connections are routine, and the account
 * should stay bound to its match across them. So a claim is released only when
 * the game itself ends, and each worker clears its own claims as it boots,
 * which covers a crash or a deploy restart.
 */
import { Pool } from "pg";
import { Logger } from "winston";

export interface ActiveMatch {
  gameId: string;
  workerId: number;
}

export interface ActiveMatchRegistry {
  /** The match this account is already in, or null if it is free to join one. */
  activeMatch(accountId: string): Promise<ActiveMatch | null>;
  /** Bind this account to this match, replacing any earlier binding. */
  claimMatch(
    accountId: string,
    gameId: string,
    workerId: number,
  ): Promise<void>;
  /** Release every claim on a finished game. */
  releaseGame(gameId: string): Promise<void>;
  /** Drop claims left behind by this worker's previous life. */
  releaseWorker(workerId: number): Promise<void>;
}

const TABLE = "active_matches";

/**
 * Fallback for dev and tests, where there is no database. Process-local, so it
 * only enforces the rule within a single process — which is exactly the shape
 * dev runs in anyway.
 */
export function createInMemoryActiveMatchRegistry(): ActiveMatchRegistry {
  const claims = new Map<string, ActiveMatch>();
  return {
    activeMatch: async (accountId) => claims.get(accountId) ?? null,
    claimMatch: async (accountId, gameId, workerId) => {
      claims.set(accountId, { gameId, workerId });
    },
    releaseGame: async (gameId) => {
      for (const [accountId, claim] of claims) {
        if (claim.gameId === gameId) claims.delete(accountId);
      }
    },
    releaseWorker: async (workerId) => {
      for (const [accountId, claim] of claims) {
        if (claim.workerId === workerId) claims.delete(accountId);
      }
    },
  };
}

export function createPostgresActiveMatchRegistry(
  pool: Pool,
  log: Logger,
): ActiveMatchRegistry {
  const ready = pool
    .query(
      `CREATE TABLE IF NOT EXISTS ${TABLE} (
         account_id text PRIMARY KEY,
         game_id    text NOT NULL,
         worker_id  integer NOT NULL,
         claimed_at timestamptz NOT NULL DEFAULT now()
       )`,
    )
    .then(() =>
      // Releasing by game and by worker are both sweeps rather than key
      // lookups, so they need their own indexes.
      Promise.all([
        pool.query(
          `CREATE INDEX IF NOT EXISTS ${TABLE}_game_idx ON ${TABLE} (game_id)`,
        ),
        pool.query(
          `CREATE INDEX IF NOT EXISTS ${TABLE}_worker_idx ON ${TABLE} (worker_id)`,
        ),
      ]),
    )
    .then(() => undefined)
    .catch((e) => {
      log.error("active match registry schema failed", { error: String(e) });
      throw e;
    });

  return {
    async activeMatch(accountId) {
      await ready;
      const result = await pool.query<{ game_id: string; worker_id: number }>(
        `SELECT game_id, worker_id FROM ${TABLE} WHERE account_id = $1`,
        [accountId],
      );
      const row = result.rows[0];
      return row ? { gameId: row.game_id, workerId: row.worker_id } : null;
    },
    async claimMatch(accountId, gameId, workerId) {
      await ready;
      await pool.query(
        `INSERT INTO ${TABLE} (account_id, game_id, worker_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (account_id) DO UPDATE
           SET game_id = EXCLUDED.game_id,
               worker_id = EXCLUDED.worker_id,
               claimed_at = now()`,
        [accountId, gameId, workerId],
      );
    },
    async releaseGame(gameId) {
      await ready;
      await pool.query(`DELETE FROM ${TABLE} WHERE game_id = $1`, [gameId]);
    },
    async releaseWorker(workerId) {
      await ready;
      await pool.query(`DELETE FROM ${TABLE} WHERE worker_id = $1`, [workerId]);
    },
  };
}

/**
 * Decides what a join should do about an existing claim. Pure, so the rule can
 * be tested without a database or a socket.
 *
 * A claim on the game being joined is not a conflict — that is the same account
 * arriving on another device, which the game's own reconnect path seats as the
 * player already there.
 */
export function planMatchClaim(args: {
  requestedGameId: string;
  existing: ActiveMatch | null;
}): { action: "claim" } | { action: "redirect"; gameId: string } {
  const { requestedGameId, existing } = args;
  if (existing === null) return { action: "claim" };
  if (existing.gameId === requestedGameId) return { action: "claim" };
  return { action: "redirect", gameId: existing.gameId };
}
