import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ClientEnv } from "src/client/ClientEnv";
import { UserMeResponse } from "../core/ApiSchemas";
import { getLastUserMe, getUserMe, hasLinkedAccount } from "./Api";
import { getPlayToken } from "./Auth";
import { BaseModal } from "./components/BaseModal";
import "./components/Difficulties";
import "./components/FriendInvitePanel";
import { modalHeader } from "./components/ui/ModalHeader";
import { crazyGamesSDK } from "./CrazyGamesSDK";
import { JoinLobbyEvent } from "./Main";
import { showToast, translateText } from "./Utils";

type RankedTeamSize = 1 | 2 | 3 | 4;
interface PartyMember {
  publicId: string;
  displayName: string;
  elo: number;
}
interface PartyState {
  code: string;
  teamSize: Exclude<RankedTeamSize, 1>;
  leaderPublicId: string;
  queued: boolean;
  members: PartyMember[];
}

@customElement("matchmaking-modal")
export class MatchmakingModal extends BaseModal {
  private gameCheckInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  @state() private connected = false;
  @state() private socket: WebSocket | null = null;
  @state() private gameID: string | null = null;
  @state() private teamSize: RankedTeamSize = 1;
  @state() private party: PartyState | null = null;
  @state() private joinCode = "";
  @state() private bots = 100;
  @state() private nations: number | "default" | "disabled" = "default";
  private elo: number | string = "...";
  private myPublicId = "";
  private playToken = "";

  constructor() {
    super();
    this.id = "page-matchmaking";
  }

  createRenderRoot() {
    return this;
  }

  protected renderHeaderSlot() {
    return modalHeader({
      title:
        this.teamSize === 1
          ? translateText("matchmaking_modal.title")
          : translateText("matchmaking_modal.team_title", {
              size: this.teamSize,
            }),
      onBack: () => this.close(),
      ariaLabel: translateText("common.back"),
    });
  }

  // Backdrop clicks and Escape must not silently remove a player from the
  // ranked queue. The visible back arrow remains the intentional cancel path.
  public confirmBeforeClose(): boolean {
    return false;
  }

  protected renderBody() {
    const eloDisplay = html`
      <p class="text-center mt-2 mb-4 text-white/60">
        ${translateText("matchmaking_modal.elo", { elo: this.elo })}
      </p>
    `;
    return html`
      <div class="flex flex-col items-center justify-center gap-6 p-6">
        ${eloDisplay} ${this.renderInner()}
      </div>
    `;
  }

  private renderInner() {
    if (!this.connected) {
      return this.renderLoadingSpinner(
        translateText("matchmaking_modal.connecting"),
        "blue",
      );
    }
    if (this.teamSize > 1 && this.party === null) {
      return this.renderPartyEntry();
    }
    if (this.teamSize > 1 && this.party !== null && !this.party.queued) {
      return this.renderPartyLobby();
    }
    if (this.gameID === null) {
      return this.renderLoadingSpinner(
        translateText("matchmaking_modal.searching"),
        "green",
      );
    } else {
      return this.renderLoadingSpinner(
        translateText("matchmaking_modal.waiting_for_game"),
        "yellow",
      );
    }
  }

  private renderPartyEntry() {
    return html`
      <div class="grid w-full max-w-xl gap-4 sm:grid-cols-2">
        <button
          class="rounded-xl bg-cyan-700 px-5 py-5 font-black uppercase tracking-wider text-white hover:bg-cyan-600"
          @click=${() => this.sendPartyMessage("party_create")}
        >
          ${translateText("matchmaking_modal.create_party")}
        </button>
        <div class="flex gap-2 rounded-xl bg-slate-900/70 p-3">
          <input
            class="min-w-0 flex-1 rounded-lg bg-slate-950 px-3 text-center font-bold uppercase text-white outline-none ring-cyan-500 focus:ring-2"
            maxlength="6"
            .value=${this.joinCode}
            placeholder=${translateText("matchmaking_modal.party_code")}
            @input=${(event: InputEvent) => {
              this.joinCode = (event.target as HTMLInputElement).value
                .replace(/[^a-zA-Z0-9]/g, "")
                .toUpperCase();
            }}
          />
          <button
            class="rounded-lg bg-cyan-700 px-4 font-bold uppercase text-white hover:bg-cyan-600 disabled:opacity-40"
            ?disabled=${this.joinCode.length !== 6}
            @click=${() => this.sendPartyMessage("party_join")}
          >
            ${translateText("matchmaking_modal.join_party")}
          </button>
        </div>
      </div>
    `;
  }

  private renderPartyLobby() {
    const party = this.party!;
    const isLeader = party.leaderPublicId === this.myPublicId;
    return html`
      <div class="w-full max-w-xl space-y-4">
        <button
          class="mx-auto block rounded-xl border border-cyan-500/60 bg-slate-950 px-6 py-3 text-center"
          @click=${() => void this.copyPartyCode()}
        >
          <span class="block text-xs uppercase tracking-widest text-white/60"
            >${translateText("matchmaking_modal.party_code")}</span
          >
          <span class="text-2xl font-black tracking-[0.25em] text-cyan-300"
            >${party.code}</span
          >
        </button>
        <div class="grid gap-2 sm:grid-cols-2">
          ${Array.from({ length: party.teamSize }, (_, index) => {
            const member = party.members[index];
            return html`
              <div
                class="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3"
              >
                <div class="font-bold text-white">
                  ${member?.displayName ??
                  translateText("matchmaking_modal.waiting_for_teammate")}
                </div>
                ${member
                  ? html`<div class="text-xs text-white/55">
                      ${translateText("matchmaking_modal.member_elo", {
                        elo: member.elo,
                      })}
                      ${member.publicId === party.leaderPublicId
                        ? ` Â· ${translateText("matchmaking_modal.party_leader")}`
                        : ""}
                    </div>`
                  : ""}
              </div>
            `;
          })}
        </div>
        <friend-invite-panel
          .title=${translateText("friends.invite_to_ranked_party")}
          .invite=${{
            kind: "ranked_party",
            partyCode: party.code,
            teamSize: party.teamSize,
          }}
        ></friend-invite-panel>
        ${isLeader ? this.renderRankedSettings() : ""}
        <button
          class="w-full rounded-xl bg-green-600 px-5 py-4 font-black uppercase tracking-widest text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-40"
          ?disabled=${!isLeader || party.members.length !== party.teamSize}
          @click=${() => this.sendPartyMessage("party_queue")}
        >
          ${isLeader
            ? party.members.length === party.teamSize
              ? translateText("matchmaking_modal.find_team_match")
              : translateText("matchmaking_modal.party_not_full")
            : translateText("matchmaking_modal.waiting_for_leader")}
        </button>
      </div>
    `;
  }

  private renderRankedSettings() {
    return html`
      <div class="grid gap-3 rounded-xl bg-slate-900/70 p-4 sm:grid-cols-2">
        <label class="space-y-1 text-xs font-bold uppercase text-white/65">
          ${translateText("matchmaking_modal.bots")}
          <select
            class="w-full rounded-lg bg-slate-950 px-3 py-2 text-white"
            .value=${String(this.bots)}
            @change=${(event: Event) =>
              (this.bots = Number((event.target as HTMLSelectElement).value))}
          >
            ${[0, 25, 50, 100, 200, 400].map(
              (count) => html`<option value=${count}>${count}</option>`,
            )}
          </select>
        </label>
        <label class="space-y-1 text-xs font-bold uppercase text-white/65">
          ${translateText("matchmaking_modal.nations")}
          <select
            class="w-full rounded-lg bg-slate-950 px-3 py-2 text-white"
            .value=${String(this.nations)}
            @change=${(event: Event) => {
              const value = (event.target as HTMLSelectElement).value;
              this.nations =
                value === "default" || value === "disabled"
                  ? value
                  : Number(value);
            }}
          >
            <option value="default">
              ${translateText("matchmaking_modal.map_default")}
            </option>
            <option value="disabled">
              ${translateText("matchmaking_modal.none")}
            </option>
            ${[25, 50, 100, 200, 400].map(
              (count) => html`<option value=${count}>${count}</option>`,
            )}
          </select>
        </label>
      </div>
    `;
  }

  private async connect() {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }
    const endpoint = new URL("/matchmaking/join", ClientEnv.jwtIssuer());
    endpoint.protocol = endpoint.protocol === "https:" ? "wss:" : "ws:";
    endpoint.searchParams.set("instance_id", ClientEnv.instanceId());
    const socket = new WebSocket(endpoint);
    this.socket = socket;
    socket.onopen = async () => {
      console.log("Connected to matchmaking server");
      if (!this.isModalOpen || socket.readyState !== WebSocket.OPEN) return;
      if (this.teamSize === 1) {
        socket.send(
          JSON.stringify({
            type: "join",
            jwt: this.playToken,
          }),
        );
      } else if (this.joinCode.length === 6) {
        this.sendPartyMessage("party_join");
      }
      this.connected = true;
      this.requestUpdate();
    };
    socket.onmessage = (event) => {
      console.log(event.data);
      const data = JSON.parse(event.data);
      if (data.type === "match-assignment") {
        socket.close();
        console.log(`matchmaking: got game ID: ${data.gameId}`);
        this.gameID = data.gameId;
        this.gameCheckInterval = setInterval(() => this.checkGame(), 1000);
      } else if (data.type === "party_state") {
        this.party = data as PartyState;
      } else if (data.type === "error") {
        showToast(
          translateText(`matchmaking_modal.error_${data.error}`),
          "red",
        );
      }
    };
    socket.onerror = (event: Event) => {
      console.error("WebSocket error occurred:", event);
    };
    socket.onclose = () => {
      console.log("Matchmaking server closed connection");
      if (this.socket === socket) this.socket = null;
      if (this.isModalOpen && this.gameID === null) {
        this.connected = false;
        this.reconnectTimeout = setTimeout(() => this.connect(), 1000);
      }
    };
  }

  protected async onOpen(args?: Record<string, unknown>): Promise<void> {
    this.teamSize =
      args?.teamSize === 2 || args?.teamSize === 3 || args?.teamSize === 4
        ? args.teamSize
        : 1;
    this.party = null;
    this.joinCode =
      typeof args?.partyCode === "string"
        ? args.partyCode.trim().toUpperCase()
        : "";
    const userMe = await getUserMe();
    // Early return if modal was closed during async operation
    if (!this.isModalOpen) {
      return;
    }

    // CrazyGames players authenticate through the SDK rather than a linked
    // Discord/email account, so a signed-in CrazyGames user counts as
    // logged in for ranked.
    const crazyGamesSignedIn =
      crazyGamesSDK.isOnCrazyGames() &&
      (await crazyGamesSDK.getUserProfile()) !== null;
    if (!this.isModalOpen) {
      return;
    }

    if (
      userMe === false ||
      (!hasLinkedAccount(userMe) && !crazyGamesSignedIn)
    ) {
      window.dispatchEvent(
        new CustomEvent("show-message", {
          detail: {
            message: translateText("matchmaking_button.must_login"),
            color: "red",
            duration: 3000,
          },
        }),
      );
      this.close();
      window.showPage?.("page-account");
      return;
    }

    this.elo =
      userMe.player.leaderboard?.oneVone?.elo ??
      translateText("matchmaking_modal.no_elo");
    this.myPublicId = userMe.player.publicId;
    this.playToken = await getPlayToken();

    this.connected = false;
    this.gameID = null;
    this.connect();
  }

  protected onClose(): void {
    this.connected = false;
    if (this.socket?.readyState === WebSocket.OPEN && this.teamSize > 1) {
      this.socket.send(JSON.stringify({ type: "party_leave" }));
    }
    this.socket?.close();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.gameCheckInterval) {
      clearInterval(this.gameCheckInterval);
      this.gameCheckInterval = null;
    }
  }

  private sendPartyMessage(
    type: "party_create" | "party_join" | "party_queue",
  ): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({
        type,
        jwt: this.playToken,
        teamSize: this.teamSize,
        code: this.joinCode,
        bots: this.bots,
        nations: this.nations,
      }),
    );
  }

  private async copyPartyCode(): Promise<void> {
    if (!this.party) return;
    await navigator.clipboard.writeText(this.party.code);
    showToast(translateText("matchmaking_modal.party_code_copied"), "green");
  }

  private async checkGame() {
    if (this.gameID === null) {
      return;
    }
    const url = `/${ClientEnv.workerPath(this.gameID)}/api/game/${this.gameID}/exists`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const gameInfo = await response.json();

    if (response.status !== 200) {
      console.error(`Error checking game ${this.gameID}: ${response.status}`);
      return;
    }

    if (!gameInfo.exists) {
      console.info(`Game ${this.gameID} does not exist or hasn't started yet`);
      return;
    }

    if (this.gameCheckInterval) {
      clearInterval(this.gameCheckInterval);
      this.gameCheckInterval = null;
    }

    this.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          gameID: this.gameID,
          source: "matchmaking",
        } as JoinLobbyEvent,
        bubbles: true,
        composed: true,
      }),
    );
  }
}

@customElement("matchmaking-button")
export class MatchmakingButton extends LitElement {
  @state() private isLoggedIn = false;

  constructor() {
    super();
  }

  async connectedCallback() {
    super.connectedCallback();
    this.isLoggedIn = hasLinkedAccount(getLastUserMe());
    // Listen for user authentication changes
    document.addEventListener("userMeResponse", (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        const userMeResponse = customEvent.detail as UserMeResponse | false;
        this.isLoggedIn = hasLinkedAccount(userMeResponse);
      }
    });
  }

  createRenderRoot() {
    return this;
  }

  render() {
    return this.isLoggedIn
      ? html`
          <button
            @click="${this.handleLoggedInClick}"
            class="no-crazygames w-full h-20 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex flex-col items-center justify-center group overflow-hidden relative"
            title="${translateText("matchmaking_modal.title")}"
          >
            <span class="relative z-10 text-2xl">
              ${translateText("matchmaking_button.play_ranked")}
            </span>
            <span
              class="relative z-10 text-xs font-medium text-purple-100 opacity-90 group-hover:opacity-100 transition-opacity"
            >
              ${translateText("matchmaking_button.description")}
            </span>
          </button>
        `
      : html`
          <button
            @click="${this.handleLoggedOutClick}"
            class="no-crazygames w-full h-20 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest rounded-xl transition-all duration-200 flex flex-col items-center justify-center overflow-hidden relative cursor-pointer"
          >
            <span class="relative z-10 text-2xl">
              ${translateText("matchmaking_button.login_required")}
            </span>
          </button>
        `;
  }

  private handleLoggedInClick() {
    document.dispatchEvent(new CustomEvent("open-matchmaking"));
  }

  private handleLoggedOutClick() {
    window.showPage?.("page-account");
  }
}
