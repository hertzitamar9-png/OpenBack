import crypto from "node:crypto";
import type http from "node:http";
import type { Logger } from "winston";
import { WebSocket, WebSocketServer } from "ws";
import {
  areBlocked,
  areFriends,
  markPlayerSeen,
  resolveRankedPlayer,
} from "./auth/AuthServer";
import { subscribeSocialEvents } from "./SocialEvents";
import { setPlayerConnected } from "./SocialPresence";

type InvitePayload =
  | { kind: "lobby"; lobbyId: string }
  | {
      kind: "ranked_party";
      partyCode: string;
      teamSize: 2 | 3 | 4;
      experienceMode: "2d" | "3d";
    }
  | { kind: "party" };

interface SocialClient {
  publicId: string;
  displayName: string;
  ws: WebSocket;
}

interface PendingInvite {
  id: string;
  from: string;
  fromName: string;
  to: string;
  createdAt: string;
  payload: InvitePayload;
}

interface Party {
  id: string;
  leaderPublicId: string;
  members: Array<{ publicId: string; displayName: string }>;
}

/** Two invitations are the same one only if they lead to the same place. */
export function samePayload(a: InvitePayload, b: InvitePayload): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "lobby" && b.kind === "lobby") return a.lobbyId === b.lobbyId;
  if (a.kind === "ranked_party" && b.kind === "ranked_party") {
    return (
      a.partyCode === b.partyCode &&
      a.teamSize === b.teamSize &&
      a.experienceMode === b.experienceMode
    );
  }
  // A party invite names no destination beyond the sender, who is the same
  // person in both, so there is nothing left to tell apart.
  return true;
}

export class SocialService {
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly clientsByPublicId = new Map<string, Set<SocialClient>>();
  private readonly clientBySocket = new Map<WebSocket, SocialClient>();
  private readonly pendingInvites = new Map<string, PendingInvite>();
  private readonly parties = new Map<string, Party>();
  private readonly partyByPublicId = new Map<string, string>();

  constructor(private readonly log: Logger) {
    subscribeSocialEvents((event) => {
      if (event.type === "blocks_changed" && event.recipients.length >= 2) {
        const [blocker, blocked] = event.recipients;
        for (const [id, invite] of this.pendingInvites) {
          if (
            (invite.from === blocker && invite.to === blocked) ||
            (invite.from === blocked && invite.to === blocker)
          ) {
            this.pendingInvites.delete(id);
            this.sendToPublicId(invite.from, {
              type: "invite_removed",
              inviteId: id,
            });
            this.sendToPublicId(invite.to, {
              type: "invite_removed",
              inviteId: id,
            });
          }
        }
        const party = this.partyFor(blocker);
        if (party?.members.some((member) => member.publicId === blocked)) {
          this.leaveParty(blocked);
        }
      }
      for (const recipient of new Set(event.recipients)) {
        this.sendToPublicId(recipient, event);
      }
    });
  }

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
    const sender = this.clientBySocket.get(ws);
    if (!sender || sender.publicId !== account.publicId) {
      this.send(ws, { type: "error", error: "not_registered" });
      return;
    }

    switch (message.type) {
      case "invite":
        this.createInvite(sender, message);
        break;
      case "invite_response":
        this.respondToInvite(sender, message);
        break;
      case "invite_cancel":
        this.cancelInvite(sender, message);
        break;
      case "party_leave":
        this.leaveParty(sender.publicId);
        break;
      case "party_state_request":
        this.sendPartyState(sender.publicId);
        this.sendPending(sender.publicId);
        break;
      default:
        this.send(ws, { type: "error", error: "invalid_message" });
    }
  }

  private createInvite(
    sender: SocialClient,
    message: Record<string, unknown>,
  ): void {
    const target = typeof message.target === "string" ? message.target : "";
    if (
      !target ||
      !areFriends(sender.publicId, target) ||
      areBlocked(sender.publicId, target)
    ) {
      this.send(sender.ws, { type: "error", error: "not_available" });
      return;
    }
    const payload = this.parseInvite(message);
    if (!payload) {
      this.send(sender.ws, { type: "error", error: "invalid_invite" });
      return;
    }
    if (payload.kind === "party") {
      const party = this.ensureParty(sender);
      if (
        party.members.length >= 4 ||
        party.members.some((member) => member.publicId === target)
      ) {
        this.send(sender.ws, { type: "error", error: "party_full_or_member" });
        return;
      }
    }
    // An invite the recipient never answered stays pending, so a second invite
    // has to say whether it is the same invitation or a new one. Comparing the
    // kind alone made every later lobby invite "the same" as the first, and
    // the reply said delivered while nothing was sent: the host invited a
    // friend to a second game and the friend was never told, still holding an
    // invitation to a lobby that had already finished.
    const supersededIds: string[] = [];
    for (const invite of this.pendingInvites.values()) {
      if (invite.from !== sender.publicId || invite.to !== target) continue;
      if (invite.payload.kind !== payload.kind) continue;
      if (samePayload(invite.payload, payload)) {
        // Genuinely the same invitation. Re-send it rather than only
        // reporting success -- the recipient may have dismissed the popup, or
        // reconnected since, and the pending list is what they read from.
        this.sendInvite(invite);
        this.send(sender.ws, {
          type: "invite_result",
          target,
          delivered: this.clientsByPublicId.has(target),
          inviteId: invite.id,
        });
        return;
      }
      // Same kind, different destination: the older one points somewhere the
      // sender has moved on from, and accepting it would send the recipient
      // to a lobby nobody is in.
      supersededIds.push(invite.id);
    }
    for (const id of supersededIds) {
      this.pendingInvites.delete(id);
      this.sendToPublicId(target, { type: "invite_removed", inviteId: id });
      this.sendToPublicId(sender.publicId, {
        type: "invite_removed",
        inviteId: id,
      });
    }
    const invite: PendingInvite = {
      id: crypto.randomUUID(),
      from: sender.publicId,
      fromName: sender.displayName,
      to: target,
      createdAt: new Date().toISOString(),
      payload,
    };
    this.pendingInvites.set(invite.id, invite);
    this.sendInvite(invite);
    this.send(sender.ws, {
      type: "invite_result",
      target,
      delivered: this.clientsByPublicId.has(target),
      inviteId: invite.id,
    });
  }

  private respondToInvite(
    sender: SocialClient,
    message: Record<string, unknown>,
  ): void {
    const invite =
      typeof message.inviteId === "string"
        ? this.pendingInvites.get(message.inviteId)
        : undefined;
    if (!invite || invite.to !== sender.publicId) return;
    this.pendingInvites.delete(invite.id);
    const accepted = message.accepted === true;
    if (accepted && invite.payload.kind === "party") {
      const inviter = this.clientFor(invite.from);
      const party = inviter
        ? this.ensureParty(inviter)
        : this.partyFor(invite.from);
      if (
        party &&
        party.members.length < 4 &&
        !this.partyByPublicId.has(sender.publicId)
      ) {
        party.members.push({
          publicId: sender.publicId,
          displayName: sender.displayName,
        });
        this.partyByPublicId.set(sender.publicId, party.id);
        this.broadcastParty(party);
      }
    }
    this.sendToPublicId(invite.from, {
      type: "invite_resolved",
      inviteId: invite.id,
      by: sender.publicId,
      accepted,
    });
    this.sendToPublicId(invite.to, {
      type: "invite_removed",
      inviteId: invite.id,
    });
  }

  private cancelInvite(
    sender: SocialClient,
    message: Record<string, unknown>,
  ): void {
    const invite =
      typeof message.inviteId === "string"
        ? this.pendingInvites.get(message.inviteId)
        : undefined;
    if (!invite || invite.from !== sender.publicId) return;
    this.pendingInvites.delete(invite.id);
    this.sendToPublicId(invite.to, {
      type: "invite_removed",
      inviteId: invite.id,
    });
    this.sendToPublicId(invite.from, {
      type: "invite_removed",
      inviteId: invite.id,
    });
  }

  private ensureParty(client: SocialClient): Party {
    const existing = this.partyFor(client.publicId);
    if (existing) return existing;
    const party: Party = {
      id: crypto.randomUUID(),
      leaderPublicId: client.publicId,
      members: [{ publicId: client.publicId, displayName: client.displayName }],
    };
    this.parties.set(party.id, party);
    this.partyByPublicId.set(client.publicId, party.id);
    this.broadcastParty(party);
    return party;
  }

  private leaveParty(publicId: string): void {
    const party = this.partyFor(publicId);
    if (!party) return;
    party.members = party.members.filter(
      (member) => member.publicId !== publicId,
    );
    this.partyByPublicId.delete(publicId);
    this.sendToPublicId(publicId, { type: "party_state", party: null });
    if (party.members.length < 2) {
      for (const member of party.members) {
        this.partyByPublicId.delete(member.publicId);
        this.sendToPublicId(member.publicId, {
          type: "party_state",
          party: null,
        });
      }
      this.parties.delete(party.id);
      return;
    }
    if (party.leaderPublicId === publicId)
      party.leaderPublicId = party.members[0].publicId;
    this.broadcastParty(party);
  }

  private partyFor(publicId: string): Party | null {
    const id = this.partyByPublicId.get(publicId);
    return id ? (this.parties.get(id) ?? null) : null;
  }

  private broadcastParty(party: Party): void {
    for (const member of party.members)
      this.sendToPublicId(member.publicId, { type: "party_state", party });
  }

  private sendPartyState(publicId: string): void {
    this.sendToPublicId(publicId, {
      type: "party_state",
      party: this.partyFor(publicId),
    });
  }

  private sendPending(publicId: string): void {
    const invites = [...this.pendingInvites.values()].filter(
      (invite) => invite.to === publicId || invite.from === publicId,
    );
    this.sendToPublicId(publicId, { type: "pending_invites", invites });
  }

  private sendInvite(invite: PendingInvite): void {
    this.sendToPublicId(invite.to, {
      type: "invite",
      ...invite,
      ...invite.payload,
    });
    this.sendPending(invite.to);
    this.sendPending(invite.from);
  }

  private parseInvite(message: Record<string, unknown>): InvitePayload | null {
    if (message.kind === "party") return { kind: "party" };
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
        experienceMode: message.experienceMode === "3d" ? "3d" : "2d",
      };
    }
    return null;
  }

  private register(ws: WebSocket, publicId: string, displayName: string): void {
    this.remove(ws);
    const wasOffline = !this.clientsByPublicId.has(publicId);
    const client = { publicId, displayName, ws };
    this.clientBySocket.set(ws, client);
    const clients = this.clientsByPublicId.get(publicId) ?? new Set();
    clients.add(client);
    this.clientsByPublicId.set(publicId, clients);
    setPlayerConnected(publicId, true);
    markPlayerSeen(publicId);
    this.send(ws, { type: "registered" });
    this.sendPartyState(publicId);
    this.sendPending(publicId);
    if (wasOffline) this.broadcastPresence(publicId, true);
  }

  private remove(ws: WebSocket): void {
    const client = this.clientBySocket.get(ws);
    if (!client) return;
    this.clientBySocket.delete(ws);
    const clients = this.clientsByPublicId.get(client.publicId);
    clients?.delete(client);
    setPlayerConnected(client.publicId, false);
    markPlayerSeen(client.publicId);
    if (clients?.size === 0) {
      this.clientsByPublicId.delete(client.publicId);
      this.broadcastPresence(client.publicId, false);
    }
  }

  private broadcastPresence(publicId: string, online: boolean): void {
    for (const id of this.clientsByPublicId.keys()) {
      if (areFriends(publicId, id))
        this.sendToPublicId(id, {
          type: "presence",
          publicId,
          online,
          lastSeenAt: new Date().toISOString(),
        });
    }
  }

  private clientFor(publicId: string): SocialClient | null {
    return this.clientsByPublicId.get(publicId)?.values().next().value ?? null;
  }

  private sendToPublicId(publicId: string, message: object): void {
    for (const client of this.clientsByPublicId.get(publicId) ?? [])
      this.send(client.ws, message);
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
