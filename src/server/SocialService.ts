import type http from "node:http";
import type { Logger } from "winston";
import { WebSocket, WebSocketServer } from "ws";
import { areFriends, resolveRankedPlayer } from "./auth/AuthServer";

type InvitePayload =
  | { kind: "lobby"; lobbyId: string }
  | { kind: "ranked_party"; partyCode: string; teamSize: 2 | 3 | 4 };

interface SocialClient {
  publicId: string;
  displayName: string;
  ws: WebSocket;
}

export class SocialService {
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly clientsByPublicId = new Map<string, Set<SocialClient>>();
  private readonly clientBySocket = new Map<WebSocket, SocialClient>();

  constructor(private readonly log: Logger) {}

  attach(server: http.Server): void {
    server.on("upgrade", (req, socket, head) => {
      let pathname: string;
      try {
        pathname = new URL(req.url ?? "", "http://localhost").pathname;
      } catch {
        return;
      }
      if (pathname !== "/social") return;
      this.wss.handleUpgrade(req, socket, head, (ws) => this.onConnection(ws));
    });
  }

  private onConnection(ws: WebSocket): void {
    ws.on("message", (raw) => {
      let value: unknown;
      try {
        value = JSON.parse(raw.toString());
      } catch {
        this.send(ws, { type: "error", error: "invalid_message" });
        return;
      }
      void this.onMessage(ws, value);
    });
    ws.on("close", () => this.remove(ws));
    ws.on("error", () => this.remove(ws));
  }

  private async onMessage(ws: WebSocket, value: unknown): Promise<void> {
    if (typeof value !== "object" || value === null) return;
    const message = value as Record<string, unknown>;
    if (typeof message.jwt !== "string") {
      this.send(ws, { type: "error", error: "unauthorized" });
      return;
    }
    const account = await resolveRankedPlayer(message.jwt);
    if (!account) {
      this.send(ws, { type: "error", error: "unauthorized" });
      ws.close();
      return;
    }

    if (message.type === "register") {
      this.register(ws, account.publicId, account.displayName);
      return;
    }
    if (message.type !== "invite" || typeof message.target !== "string") {
      this.send(ws, { type: "error", error: "invalid_message" });
      return;
    }
    const sender = this.clientBySocket.get(ws);
    if (!sender || sender.publicId !== account.publicId) {
      this.send(ws, { type: "error", error: "not_registered" });
      return;
    }
    if (!areFriends(sender.publicId, message.target)) {
      this.send(ws, { type: "error", error: "not_friends" });
      return;
    }
    const payload = this.parseInvite(message);
    if (!payload) {
      this.send(ws, { type: "error", error: "invalid_invite" });
      return;
    }
    const targets = this.clientsByPublicId.get(message.target);
    if (!targets || targets.size === 0) {
      this.send(ws, {
        type: "invite_result",
        target: message.target,
        delivered: false,
      });
      return;
    }
    for (const target of targets) {
      this.send(target.ws, {
        type: "invite",
        from: sender.publicId,
        fromName: sender.displayName,
        ...payload,
      });
    }
    this.send(ws, {
      type: "invite_result",
      target: message.target,
      delivered: true,
    });
    this.log.info(
      `social: ${sender.publicId} invited ${message.target} to ${payload.kind}`,
    );
  }

  private parseInvite(message: Record<string, unknown>): InvitePayload | null {
    if (
      message.kind === "lobby" &&
      typeof message.lobbyId === "string" &&
      /^[A-Za-z0-9_-]{4,32}$/.test(message.lobbyId)
    ) {
      return { kind: "lobby", lobbyId: message.lobbyId };
    }
    if (
      message.kind === "ranked_party" &&
      typeof message.partyCode === "string" &&
      /^[A-Fa-f0-9]{6}$/.test(message.partyCode) &&
      (message.teamSize === 2 ||
        message.teamSize === 3 ||
        message.teamSize === 4)
    ) {
      return {
        kind: "ranked_party",
        partyCode: message.partyCode.toUpperCase(),
        teamSize: message.teamSize,
      };
    }
    return null;
  }

  private register(ws: WebSocket, publicId: string, displayName: string): void {
    this.remove(ws);
    const client = { publicId, displayName, ws };
    this.clientBySocket.set(ws, client);
    const clients = this.clientsByPublicId.get(publicId) ?? new Set();
    clients.add(client);
    this.clientsByPublicId.set(publicId, clients);
    this.send(ws, { type: "registered" });
  }

  private remove(ws: WebSocket): void {
    const client = this.clientBySocket.get(ws);
    if (!client) return;
    this.clientBySocket.delete(ws);
    const clients = this.clientsByPublicId.get(client.publicId);
    clients?.delete(client);
    if (clients?.size === 0) this.clientsByPublicId.delete(client.publicId);
  }

  private send(ws: WebSocket, message: object): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(message));
    } catch {
      this.remove(ws);
    }
  }
}
