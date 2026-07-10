import type express from "express";
import type http from "http";
import { WebSocket, WebSocketServer } from "ws";
import type { Logger } from "winston";
import {
  recordRankedResult,
  resolveRankedPlayer,
} from "./auth/AuthServer";
import { ServerEnv } from "./ServerEnv";

// ---------------------------------------------------------------------------
// Self-contained ranked matchmaking for OpenBack. OpenFront's matchmaking is a
// closed-source Cloudflare Worker; this re-implements the pieces the client and
// game workers depend on:
//   - WS /matchmaking/join   : players queue and receive a match-assignment.
//   - POST /checkin          : workers offer a gameId; the master assigns pairs.
//   - POST /matchmaking/result: a worker reports a finished 1v1 for Elo updates.
// Everything lives in the master process, alongside the auth user store, so it
// can read/update Elo directly.
// ---------------------------------------------------------------------------

interface QueueEntry {
  publicId: string;
  elo: number;
  ws: WebSocket;
  joinedAt: number;
}

// Elo tolerance for a fresh queue entry, widening with wait time so nobody
// waits forever when the pool is thin.
const BASE_ELO_TOLERANCE = 100;
const ELO_TOLERANCE_GROWTH_PER_SEC = 40;

export class MatchmakingService {
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly queue: QueueEntry[] = [];

  constructor(private readonly log: Logger) {}

  // Attach the WS upgrade handler to the master's HTTP server. Only
  // /matchmaking/join is handled here; other upgrades are left untouched.
  attach(server: http.Server): void {
    server.on("upgrade", (req, socket, head) => {
      let pathname: string;
      try {
        pathname = new URL(req.url ?? "", "http://localhost").pathname;
      } catch {
        return;
      }
      if (pathname !== "/matchmaking/join") return;
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.onConnection(ws);
      });
    });
  }

  private onConnection(ws: WebSocket): void {
    ws.on("message", (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      void this.onMessage(ws, msg);
    });
    ws.on("close", () => this.removeSocket(ws));
    ws.on("error", () => this.removeSocket(ws));
  }

  private async onMessage(ws: WebSocket, msg: unknown): Promise<void> {
    if (
      typeof msg !== "object" ||
      msg === null ||
      (msg as { type?: unknown }).type !== "join" ||
      typeof (msg as { jwt?: unknown }).jwt !== "string"
    ) {
      return;
    }
    const player = await resolveRankedPlayer((msg as { jwt: string }).jwt);
    if (!player) {
      try {
        ws.send(JSON.stringify({ type: "error", error: "unauthorized" }));
      } catch {
        /* ignore */
      }
      ws.close();
      return;
    }
    // Replace any stale entry for the same player (reconnect / double click).
    this.removeByPublicId(player.publicId);
    this.queue.push({
      publicId: player.publicId,
      elo: player.elo,
      ws,
      joinedAt: Date.now(),
    });
    this.log.info(
      `matchmaking: ${player.publicId} queued (elo ${player.elo}), queue size ${this.queue.length}`,
    );
  }

  private removeSocket(ws: WebSocket): void {
    const i = this.queue.findIndex((e) => e.ws === ws);
    if (i !== -1) this.queue.splice(i, 1);
  }

  private removeByPublicId(publicId: string): void {
    const i = this.queue.findIndex((e) => e.publicId === publicId);
    if (i !== -1) {
      try {
        this.queue[i].ws.close();
      } catch {
        /* ignore */
      }
      this.queue.splice(i, 1);
    }
  }

  // Oldest-waiting player is matched first with their closest eligible
  // opponent; tolerance widens with that player's wait time.
  private findMatch(): [QueueEntry, QueueEntry] | null {
    const byAge = [...this.queue].sort((a, b) => a.joinedAt - b.joinedAt);
    for (const a of byAge) {
      const waitSec = (Date.now() - a.joinedAt) / 1000;
      const tolerance =
        BASE_ELO_TOLERANCE + ELO_TOLERANCE_GROWTH_PER_SEC * waitSec;
      let best: QueueEntry | null = null;
      let bestDiff = Infinity;
      for (const b of this.queue) {
        if (b === a) continue;
        const diff = Math.abs(a.elo - b.elo);
        if (diff <= tolerance && diff < bestDiff) {
          best = b;
          bestDiff = diff;
        }
      }
      if (best) return [a, best];
    }
    return null;
  }

  // Worker checkin. A worker offers a gameId it owns; if two compatible players
  // are waiting we pair them onto that game and tell the worker to create it.
  handleCheckin = (req: express.Request, res: express.Response): void => {
    if (req.header("x-api-key") !== ServerEnv.apiKey()) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const gameId = (req.body as { gameId?: unknown })?.gameId;
    if (typeof gameId !== "string" || gameId.length === 0) {
      res.status(400).json({ error: "missing_game_id" });
      return;
    }

    const match = this.findMatch();
    if (!match) {
      res.json({ assignment: false });
      return;
    }

    const [a, b] = match;
    this.removeByPublicId(a.publicId);
    this.removeByPublicId(b.publicId);
    for (const entry of [a, b]) {
      try {
        entry.ws.send(JSON.stringify({ type: "match-assignment", gameId }));
        entry.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.log.info(
      `matchmaking: paired ${a.publicId} (${a.elo}) vs ${b.publicId} (${b.elo}) -> ${gameId}`,
    );
    res.json({ assignment: true });
  };

  // A worker reports a finished ranked 1v1 so Elo can be updated.
  handleResult = (req: express.Request, res: express.Response): void => {
    if (req.header("x-api-key") !== ServerEnv.apiKey()) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const body = req.body as { winner?: unknown; loser?: unknown };
    if (typeof body?.winner !== "string" || typeof body?.loser !== "string") {
      res.status(400).json({ error: "invalid_result" });
      return;
    }
    const ok = recordRankedResult(body.winner, body.loser);
    if (!ok) {
      res.status(404).json({ error: "unknown_player" });
      return;
    }
    res.json({ ok: true });
  };
}
