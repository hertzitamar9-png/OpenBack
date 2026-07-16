import crypto from "crypto";
import type express from "express";
import type http from "http";
import type { Logger } from "winston";
import { WebSocket, WebSocketServer } from "ws";
import type { GameConfig } from "../core/Schemas";
import {
  recordRankedResult,
  recordRankedTeamResult,
  resolveRankedPlayer,
} from "./auth/AuthServer";
import { ServerEnv } from "./ServerEnv";

type RankedTeamSize = 1 | 2 | 3 | 4;
type RankedNations = number | "default" | "disabled";

interface RankedPreferences {
  bots?: number;
  nations?: RankedNations;
}

interface RankedPlayer {
  publicId: string;
  elo: number;
  displayName: string;
  ws: WebSocket;
}

interface QueueGroup {
  players: RankedPlayer[];
  teamSize: RankedTeamSize;
  joinedAt: number;
  preferences: RankedPreferences;
  partyCode?: string;
}

interface Party {
  code: string;
  teamSize: Exclude<RankedTeamSize, 1>;
  leaderPublicId: string;
  members: RankedPlayer[];
  queued: boolean;
  preferences: RankedPreferences;
}

type RankedConfigFactory = (
  teamSize: RankedTeamSize,
  teams: string[][],
  preferences?: RankedPreferences,
) => GameConfig;

export class MatchmakingService {
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly queue: QueueGroup[] = [];
  private readonly parties = new Map<string, Party>();
  private readonly partyByPublicId = new Map<string, string>();

  constructor(
    private readonly log: Logger,
    private readonly createRankedConfig?: RankedConfigFactory,
  ) {}

  attach(server: http.Server): void {
    server.on("upgrade", (req, socket, head) => {
      let pathname: string;
      try {
        pathname = new URL(req.url ?? "", "http://localhost").pathname;
      } catch {
        return;
      }
      if (pathname !== "/matchmaking/join") return;
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws));
    });
  }

  private onConnection(ws: WebSocket): void {
    ws.on("message", (raw) => {
      let msg: unknown;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        this.send(ws, { type: "error", error: "invalid_message" });
        return;
      }
      void this.onMessage(ws, msg);
    });
    ws.on("close", () => this.removeSocket(ws));
    ws.on("error", () => this.removeSocket(ws));
  }

  private async onMessage(ws: WebSocket, value: unknown): Promise<void> {
    if (typeof value !== "object" || value === null) return;
    const msg = value as Record<string, unknown>;
    const type = msg.type;
    if (typeof type !== "string") return;

    if (type === "party_leave") {
      this.removeSocket(ws);
      return;
    }
    if (typeof msg.jwt !== "string") {
      this.send(ws, { type: "error", error: "unauthorized" });
      return;
    }
    const account = await resolveRankedPlayer(msg.jwt);
    if (!account) {
      this.send(ws, { type: "error", error: "unauthorized" });
      ws.close();
      return;
    }
    const player: RankedPlayer = {
      publicId: account.publicId,
      elo: account.elo,
      displayName: account.displayName,
      ws,
    };

    switch (type) {
      case "join":
        this.joinSoloQueue(player, this.parsePreferences(msg));
        break;
      case "party_create": {
        const teamSize = this.parseTeamSize(msg.teamSize);
        if (teamSize === null || teamSize === 1) {
          this.send(ws, { type: "error", error: "invalid_team_size" });
          return;
        }
        this.createParty(player, teamSize);
        break;
      }
      case "party_join":
        if (typeof msg.code !== "string") {
          this.send(ws, { type: "error", error: "invalid_party_code" });
          return;
        }
        this.joinParty(player, msg.code);
        break;
      case "party_queue":
        this.queueParty(player.publicId, this.parsePreferences(msg));
        break;
      default:
        this.send(ws, { type: "error", error: "invalid_message" });
    }
  }

  private joinSoloQueue(
    player: RankedPlayer,
    preferences: RankedPreferences,
  ): void {
    this.removeByPublicId(player.publicId);
    this.queue.push({
      players: [player],
      teamSize: 1,
      joinedAt: Date.now(),
      preferences,
    });
    this.send(player.ws, { type: "queue_state", queued: true });
    this.log.info(
      `matchmaking: ${player.publicId} queued (elo ${player.elo}), groups ${this.queue.length}`,
    );
  }

  private createParty(
    player: RankedPlayer,
    teamSize: Exclude<RankedTeamSize, 1>,
  ): void {
    this.removeByPublicId(player.publicId);
    let code = crypto.randomBytes(3).toString("hex").toUpperCase();
    while (this.parties.has(code)) {
      code = crypto.randomBytes(3).toString("hex").toUpperCase();
    }
    const party: Party = {
      code,
      teamSize,
      leaderPublicId: player.publicId,
      members: [player],
      queued: false,
      preferences: {},
    };
    this.parties.set(code, party);
    this.partyByPublicId.set(player.publicId, code);
    this.broadcastParty(party);
  }

  private joinParty(player: RankedPlayer, rawCode: string): void {
    const code = rawCode.trim().toUpperCase();
    const party = this.parties.get(code);
    if (!party) {
      this.send(player.ws, { type: "error", error: "party_not_found" });
      return;
    }
    if (party.queued) {
      this.send(player.ws, { type: "error", error: "party_already_queued" });
      return;
    }
    if (party.members.length >= party.teamSize) {
      this.send(player.ws, { type: "error", error: "party_full" });
      return;
    }
    this.removeByPublicId(player.publicId);
    party.members.push(player);
    this.partyByPublicId.set(player.publicId, code);
    this.broadcastParty(party);
  }

  private queueParty(publicId: string, preferences: RankedPreferences): void {
    const party = this.partyForPlayer(publicId);
    if (!party) return;
    if (party.leaderPublicId !== publicId) {
      this.sendToPlayer(party, publicId, {
        type: "error",
        error: "party_leader_only",
      });
      return;
    }
    if (party.members.length !== party.teamSize) {
      this.sendToPlayer(party, publicId, {
        type: "error",
        error: "party_not_full",
      });
      return;
    }
    party.queued = true;
    party.preferences = preferences;
    this.removeQueuedParty(party.code);
    this.queue.push({
      players: [...party.members],
      teamSize: party.teamSize,
      joinedAt: Date.now(),
      preferences,
      partyCode: party.code,
    });
    this.broadcastParty(party);
  }

  private parseTeamSize(value: unknown): RankedTeamSize | null {
    return value === 1 || value === 2 || value === 3 || value === 4
      ? value
      : null;
  }

  private parsePreferences(msg: Record<string, unknown>): RankedPreferences {
    const bots =
      typeof msg.bots === "number" &&
      Number.isInteger(msg.bots) &&
      msg.bots >= 0 &&
      msg.bots <= 400
        ? msg.bots
        : undefined;
    const rawNations = msg.nations;
    const nations: RankedNations | undefined =
      rawNations === "default" || rawNations === "disabled"
        ? rawNations
        : typeof rawNations === "number" &&
            Number.isInteger(rawNations) &&
            rawNations >= 1 &&
            rawNations <= 400
          ? rawNations
          : undefined;
    return { bots, nations };
  }

  private samePreferences(a: RankedPreferences, b: RankedPreferences): boolean {
    return (
      (a.bots ?? -1) === (b.bots ?? -1) &&
      (a.nations ?? "random") === (b.nations ?? "random")
    );
  }

  private findMatch(): [QueueGroup, QueueGroup] | null {
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const group = this.queue[i];
      if (
        group.players.some((player) => player.ws.readyState !== WebSocket.OPEN)
      ) {
        this.queue.splice(i, 1);
      }
    }
    if (this.queue.length < 2) return null;
    let oldest: QueueGroup | null = null;
    for (const group of this.queue) {
      if (oldest === null || group.joinedAt < oldest.joinedAt) oldest = group;
    }
    if (!oldest) return null;

    let closest: QueueGroup | null = null;
    let closestGap = Infinity;
    const oldestElo = this.averageElo(oldest);
    for (const group of this.queue) {
      if (
        group === oldest ||
        group.teamSize !== oldest.teamSize ||
        !this.samePreferences(group.preferences, oldest.preferences)
      ) {
        continue;
      }
      const gap = Math.abs(oldestElo - this.averageElo(group));
      if (
        closest === null ||
        gap < closestGap ||
        (gap === closestGap && group.joinedAt < closest.joinedAt)
      ) {
        closest = group;
        closestGap = gap;
      }
    }
    return closest ? [oldest, closest] : null;
  }

  private averageElo(group: QueueGroup): number {
    return (
      group.players.reduce((sum, player) => sum + player.elo, 0) /
      group.players.length
    );
  }

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
    this.removeQueueGroup(a);
    this.removeQueueGroup(b);
    const allPlayers = [...a.players, ...b.players];
    for (const player of allPlayers) {
      this.send(player.ws, { type: "match-assignment", gameId });
      player.ws.close();
    }
    const teams = [
      a.players.map((player) => player.publicId),
      b.players.map((player) => player.publicId),
    ];
    const gameConfig = this.createRankedConfig?.(
      a.teamSize,
      teams,
      a.preferences,
    );
    this.log.info(
      `matchmaking: ${a.teamSize}v${a.teamSize} ${teams
        .map((team) => team.join(","))
        .join(" vs ")} -> ${gameId}`,
    );
    res.json(
      gameConfig === undefined
        ? { assignment: true }
        : { assignment: true, gameConfig },
    );
  };

  handleResult = (req: express.Request, res: express.Response): void => {
    if (req.header("x-api-key") !== ServerEnv.apiKey()) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const body = req.body as {
      winner?: unknown;
      loser?: unknown;
      winners?: unknown;
      losers?: unknown;
    };
    const winnerIds = Array.isArray(body.winners)
      ? body.winners.filter((id): id is string => typeof id === "string")
      : [];
    const loserIds = Array.isArray(body.losers)
      ? body.losers.filter((id): id is string => typeof id === "string")
      : [];
    const ok =
      winnerIds.length > 0 && loserIds.length > 0
        ? recordRankedTeamResult(winnerIds, loserIds)
        : typeof body.winner === "string" && typeof body.loser === "string"
          ? recordRankedResult(body.winner, body.loser)
          : false;
    if (!ok) {
      res.status(404).json({ error: "unknown_player" });
      return;
    }
    res.json({ ok: true });
  };

  private removeSocket(ws: WebSocket): void {
    const solo = this.queue.find((group) =>
      group.players.some((player) => player.ws === ws),
    );
    if (solo) this.removeQueueGroup(solo);

    for (const party of this.parties.values()) {
      const member = party.members.find((candidate) => candidate.ws === ws);
      if (!member) continue;
      this.removePartyMember(party, member.publicId);
      break;
    }
  }

  private removeByPublicId(publicId: string): void {
    const group = this.queue.find((candidate) =>
      candidate.players.some((player) => player.publicId === publicId),
    );
    if (group) this.removeQueueGroup(group);
    const party = this.partyForPlayer(publicId);
    if (party) this.removePartyMember(party, publicId);
  }

  private removePartyMember(party: Party, publicId: string): void {
    this.removeQueuedParty(party.code);
    party.queued = false;
    party.members = party.members.filter(
      (member) => member.publicId !== publicId,
    );
    this.partyByPublicId.delete(publicId);
    if (party.members.length === 0) {
      this.parties.delete(party.code);
      return;
    }
    if (party.leaderPublicId === publicId) {
      party.leaderPublicId = party.members[0].publicId;
    }
    this.broadcastParty(party);
  }

  private removeQueueGroup(group: QueueGroup): void {
    const index = this.queue.indexOf(group);
    if (index !== -1) this.queue.splice(index, 1);
    if (group.partyCode) {
      const party = this.parties.get(group.partyCode);
      if (party) party.queued = false;
    }
  }

  private removeQueuedParty(code: string): void {
    const group = this.queue.find((candidate) => candidate.partyCode === code);
    if (group) this.removeQueueGroup(group);
  }

  private partyForPlayer(publicId: string): Party | null {
    const code = this.partyByPublicId.get(publicId);
    return code ? (this.parties.get(code) ?? null) : null;
  }

  private broadcastParty(party: Party): void {
    const message = {
      type: "party_state",
      code: party.code,
      teamSize: party.teamSize,
      leaderPublicId: party.leaderPublicId,
      queued: party.queued,
      members: party.members.map(({ publicId, displayName, elo }) => ({
        publicId,
        displayName,
        elo,
      })),
    };
    for (const member of party.members) this.send(member.ws, message);
  }

  private sendToPlayer(party: Party, publicId: string, message: object): void {
    const member = party.members.find(
      (candidate) => candidate.publicId === publicId,
    );
    if (member) this.send(member.ws, message);
  }

  private send(ws: WebSocket, message: object): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(message));
    } catch {
      /* The close handler removes stale queue/party state. */
    }
  }
}
