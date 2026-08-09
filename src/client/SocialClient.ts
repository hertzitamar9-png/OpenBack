import { getPlayToken } from "./Auth";
import { ClientEnv } from "./ClientEnv";

export type SocialInvite =
  | { kind: "lobby"; lobbyId: string }
  | { kind: "ranked_party"; partyCode: string; teamSize: 2 | 3 | 4 }
  | { kind: "party" };

export interface GlobalPartyState {
  id: string;
  leaderPublicId: string;
  members: Array<{ publicId: string; displayName: string }>;
}

export interface PendingSocialInvite {
  id: string;
  from: string;
  fromName: string;
  to: string;
  createdAt: string;
  payload: SocialInvite;
}

class OpenBackSocialClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private started = false;
  private pendingResults = new Map<
    string,
    Array<(delivered: boolean) => void>
  >();
  private party: GlobalPartyState | null = null;
  private invites: PendingSocialInvite[] = [];

  start(): void {
    if (this.started) return;
    this.started = true;
    document.addEventListener("userMeResponse", () => this.reconnect());
    this.connect();
  }

  getParty(): GlobalPartyState | null {
    return this.party;
  }

  getPendingInvites(): PendingSocialInvite[] {
    return [...this.invites];
  }

  async invite(target: string, invite: SocialInvite): Promise<boolean> {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    const delivered = new Promise<boolean>((resolve) => {
      const callbacks = this.pendingResults.get(target) ?? [];
      callbacks.push(resolve);
      this.pendingResults.set(target, callbacks);
      window.setTimeout(() => this.resolvePendingResult(target, false), 5000);
    });
    this.send({ type: "invite", target, ...invite });
    return delivered;
  }

  inviteToParty(target: string): Promise<boolean> {
    return this.invite(target, { kind: "party" });
  }

  leaveParty(): void {
    this.send({ type: "party_leave" });
  }

  respondToInvite(inviteId: string, accepted: boolean): void {
    this.send({ type: "invite_response", inviteId, accepted });
  }

  acceptInvite(invite: PendingSocialInvite): void {
    this.respondToInvite(invite.id, true);
    if (invite.payload.kind === "lobby") {
      document.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: { gameID: invite.payload.lobbyId, source: "invite" },
        }),
      );
    } else if (invite.payload.kind === "ranked_party") {
      document.dispatchEvent(
        new CustomEvent("open-matchmaking", {
          detail: {
            teamSize: invite.payload.teamSize,
            partyCode: invite.payload.partyCode,
          },
        }),
      );
    }
  }

  cancelInvite(inviteId: string): void {
    this.send({ type: "invite_cancel", inviteId });
  }

  private async send(message: Record<string, unknown>): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ ...message, jwt: await getPlayToken() }));
  }

  private reconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.connect();
  }

  private connect(): void {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    )
      return;
    const base =
      window.location.hostname === "localhost"
        ? ClientEnv.jwtIssuer()
        : window.location.origin;
    const endpoint = new URL("/social", base);
    endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(endpoint);
    this.socket = socket;
    socket.onopen = () => {
      if (socket !== this.socket) return;
      void this.send({ type: "register" });
    };
    socket.onmessage = (event) => this.handleMessage(event);
    socket.onclose = () => {
      if (socket !== this.socket) return;
      this.socket = null;
      if (this.reconnectTimer !== null) return;
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 1000);
    };
  }

  private handleMessage(event: MessageEvent): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(String(event.data)) as Record<string, unknown>;
    } catch {
      return;
    }
    if (message.type === "registered") {
      void this.send({ type: "party_state_request" });
      return;
    }
    if (
      message.type === "invite_result" &&
      typeof message.target === "string"
    ) {
      this.resolvePendingResult(message.target, message.delivered === true);
      return;
    }
    if (message.type === "party_state") {
      this.party = (message.party as GlobalPartyState | null) ?? null;
      document.dispatchEvent(
        new CustomEvent("social-party-changed", { detail: this.party }),
      );
      return;
    }
    if (message.type === "pending_invites" && Array.isArray(message.invites)) {
      this.invites = (message.invites as Array<Record<string, unknown>>).map(
        (invite) => ({
          id: String(invite.id),
          from: String(invite.from),
          fromName: String(invite.fromName),
          to: String(invite.to),
          createdAt: String(invite.createdAt),
          payload: invite.payload as SocialInvite,
        }),
      );
      document.dispatchEvent(
        new CustomEvent("social-invites-changed", {
          detail: this.getPendingInvites(),
        }),
      );
      return;
    }
    if (
      message.type === "invite_removed" &&
      typeof message.inviteId === "string"
    ) {
      this.invites = this.invites.filter(
        (invite) => invite.id !== message.inviteId,
      );
      document.dispatchEvent(
        new CustomEvent("social-invites-changed", {
          detail: this.getPendingInvites(),
        }),
      );
      return;
    }
    if (
      message.type === "friends_changed" ||
      message.type === "blocks_changed"
    ) {
      document.dispatchEvent(new CustomEvent("social-friends-changed"));
      return;
    }
    if (message.type === "presence") {
      document.dispatchEvent(
        new CustomEvent("social-presence-changed", { detail: message }),
      );
      return;
    }
    if (message.type === "chat_message") {
      document.dispatchEvent(
        new CustomEvent("social-chat-message", { detail: message }),
      );
      return;
    }
    // The server follows each invite with the authoritative pending list. The
    // global popup and Friends tab render from that list, avoiding duplicate
    // prompts and preserving invitations after the five-second popup closes.
  }

  private resolvePendingResult(target: string, delivered: boolean): void {
    const callbacks = this.pendingResults.get(target);
    if (!callbacks?.length) return;
    callbacks.shift()!(delivered);
    if (callbacks.length === 0) this.pendingResults.delete(target);
  }
}

export const socialClient = new OpenBackSocialClient();
