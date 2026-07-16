import { getPlayToken } from "./Auth";
import { ClientEnv } from "./ClientEnv";
import { showInGameConfirm } from "./InGameModal";
import { showToast, translateText } from "./Utils";

export type SocialInvite =
  | { kind: "lobby"; lobbyId: string }
  | { kind: "ranked_party"; partyCode: string; teamSize: 2 | 3 | 4 };

class OpenBackSocialClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private started = false;
  private pending = new Map<string, Array<(delivered: boolean) => void>>();

  start(): void {
    if (this.started) return;
    this.started = true;
    document.addEventListener("userMeResponse", () => this.reconnect());
    this.connect();
  }

  async invite(target: string, invite: SocialInvite): Promise<boolean> {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    const delivered = new Promise<boolean>((resolve) => {
      const callbacks = this.pending.get(target) ?? [];
      callbacks.push(resolve);
      this.pending.set(target, callbacks);
      window.setTimeout(() => this.resolvePending(target, false), 5000);
    });
    this.socket.send(
      JSON.stringify({
        type: "invite",
        jwt: await getPlayToken(),
        target,
        ...invite,
      }),
    );
    return delivered;
  }

  private reconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.connect();
  }

  private connect(): void {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }
    const endpoint = new URL("/social", ClientEnv.jwtIssuer());
    endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(endpoint);
    this.socket = socket;
    socket.onopen = async () => {
      if (socket !== this.socket) return;
      socket.send(
        JSON.stringify({
          type: "register",
          jwt: await getPlayToken(),
        }),
      );
    };
    socket.onmessage = (event) => this.handleMessage(event);
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      if (this.reconnectTimer !== null) return;
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 2000);
    };
  }

  private handleMessage(event: MessageEvent): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(String(event.data)) as Record<string, unknown>;
    } catch {
      return;
    }
    if (
      message.type === "invite_result" &&
      typeof message.target === "string"
    ) {
      this.resolvePending(message.target, message.delivered === true);
      return;
    }
    if (message.type === "invite") void this.handleInvite(message);
  }

  private resolvePending(target: string, delivered: boolean): void {
    const callbacks = this.pending.get(target);
    if (!callbacks?.length) return;
    const resolve = callbacks.shift()!;
    if (callbacks.length === 0) this.pending.delete(target);
    resolve(delivered);
  }

  private async handleInvite(message: Record<string, unknown>): Promise<void> {
    const fromName =
      typeof message.fromName === "string"
        ? message.fromName
        : String(message.from ?? "");
    const kind = message.kind;
    const accepted = await showInGameConfirm(
      translateText(
        kind === "lobby"
          ? "friends.lobby_invite_received"
          : "friends.ranked_invite_received",
        { player: fromName },
      ),
    );
    if (!accepted) return;

    if (kind === "lobby" && typeof message.lobbyId === "string") {
      document.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: { gameID: message.lobbyId, source: "invite" },
        }),
      );
      return;
    }
    if (
      kind === "ranked_party" &&
      typeof message.partyCode === "string" &&
      (message.teamSize === 2 ||
        message.teamSize === 3 ||
        message.teamSize === 4)
    ) {
      document.dispatchEvent(
        new CustomEvent("open-matchmaking", {
          detail: {
            teamSize: message.teamSize,
            partyCode: message.partyCode,
          },
        }),
      );
      return;
    }
    showToast(translateText("friends.invite_invalid"), "red");
  }
}

export const socialClient = new OpenBackSocialClient();
