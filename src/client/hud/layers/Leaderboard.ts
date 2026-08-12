import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { repeat } from "lit/directives/repeat.js";
import { renderTroops, showToast, translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { PlayerType } from "../../../core/game/Game";
import "../../components/PlayerAvatar";
import { Controller } from "../../Controller";
import { blockPlayer, sendFriendRequest } from "../../FriendsApi";
import { TerritoryFlashEvent } from "../../InputHandler";
import { GoToPlayerEvent } from "../../TransformHandler";
import { formatPercentage, renderNumber } from "../../Utils";
import { GameView, PlayerView } from "../../view";

interface Entry {
  name: string;
  position: number;
  score: string;
  gold: string;
  maxTroops: string;
  isMyPlayer: boolean;
  isOnSameTeam: boolean;
  player: PlayerView;
  profilePictureUrl: string | null;
}

@customElement("leader-board")
export class Leaderboard extends LitElement implements Controller {
  public game: GameView | null = null;
  public eventBus: EventBus | null = null;

  @state()
  players: Entry[] = [];

  @property({ type: Boolean }) visible = false;
  @state()
  private showTopFive = true;
  @state()
  private contextMenu: {
    player: PlayerView;
    publicId: string;
    x: number;
    y: number;
  } | null = null;
  private friendRequestPending = false;

  @state()
  private _sortKey: "tiles" | "gold" | "maxtroops" = "tiles";

  @state()
  private _sortOrder: "asc" | "desc" = "desc";

  createRenderRoot() {
    return this; // use light DOM for Tailwind support
  }

  init() {}

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has("visible") && this.visible) {
      this.updateLeaderboard();
    }
  }

  getTickIntervalMs() {
    return 1000;
  }

  tick() {
    if (this.game === null) throw new Error("Not initialized");
    if (!this.visible) return;
    this.updateLeaderboard();
  }

  private setSort(key: "tiles" | "gold" | "maxtroops") {
    if (this._sortKey === key) {
      this._sortOrder = this._sortOrder === "asc" ? "desc" : "asc";
    } else {
      this._sortKey = key;
      this._sortOrder = "desc";
    }
    this.updateLeaderboard();
  }

  private updateLeaderboard() {
    if (this.game === null) throw new Error("Not initialized");
    const myPlayer = this.game.myPlayer();
    const showPrivateInfiniteGold = this.game
      .config()
      .hasPrivateInfiniteGold(this.game.myClientID());

    let sorted = this.game.playerViews();

    const compare = (a: number, b: number) =>
      this._sortOrder === "asc" ? a - b : b - a;

    const maxTroops = (p: PlayerView) => this.game!.config().maxTroops(p);

    switch (this._sortKey) {
      case "gold":
        sorted = sorted.sort((a, b) =>
          compare(Number(a.gold()), Number(b.gold())),
        );
        break;
      case "maxtroops":
        sorted = sorted.sort((a, b) => compare(maxTroops(a), maxTroops(b)));
        break;
      default:
        sorted = sorted.sort((a, b) =>
          compare(a.numTilesOwned(), b.numTilesOwned()),
        );
    }

    const numTilesWithoutFallout =
      this.game.numLandTiles() - this.game.numTilesWithFallout();

    const alivePlayers = sorted.filter((player) => player.isAlive());
    const playersToShow = this.showTopFive
      ? alivePlayers.slice(0, 5)
      : alivePlayers;

    this.players = playersToShow.map((player, index) => {
      const maxTroops = this.game!.config().maxTroops(player);
      return {
        name: player.displayName(),
        position: index + 1,
        score: formatPercentage(
          player.numTilesOwned() / numTilesWithoutFallout,
        ),
        gold:
          showPrivateInfiniteGold && player === myPlayer
            ? "∞"
            : renderNumber(player.gold()),
        maxTroops: renderTroops(maxTroops),
        isMyPlayer: player === myPlayer,
        isOnSameTeam:
          myPlayer !== null &&
          (player === myPlayer || player.isOnSameTeam(myPlayer)),
        player: player,
        profilePictureUrl: this.game!.profilePictureForPlayer(player),
      };
    });

    if (
      myPlayer !== null &&
      this.players.find((p) => p.isMyPlayer) === undefined
    ) {
      let place = 0;
      for (const p of sorted) {
        place++;
        if (p === myPlayer) {
          break;
        }
      }

      if (myPlayer.isAlive()) {
        const myPlayerMaxTroops = this.game!.config().maxTroops(myPlayer);
        this.players.pop();
        this.players.push({
          name: myPlayer.displayName(),
          position: place,
          score: formatPercentage(
            myPlayer.numTilesOwned() / this.game.numLandTiles(),
          ),
          gold: showPrivateInfiniteGold ? "∞" : renderNumber(myPlayer.gold()),
          maxTroops: renderTroops(myPlayerMaxTroops),
          isMyPlayer: true,
          isOnSameTeam: true,
          player: myPlayer,
          profilePictureUrl: this.game!.profilePictureForPlayer(myPlayer),
        });
      }
    }

    this.requestUpdate();
  }

  private handleRowClickPlayer(player: PlayerView) {
    this.contextMenu = null;
    if (this.eventBus === null) return;
    this.eventBus.emit(new GoToPlayerEvent(player, 6));
    this.eventBus.emit(new TerritoryFlashEvent(player.smallID(), 3000));
  }

  private openPlayerMenu(event: MouseEvent, player: PlayerView) {
    event.preventDefault();
    event.stopPropagation();
    if (
      this.game === null ||
      player.type() !== PlayerType.Human ||
      player === this.game.myPlayer()
    ) {
      this.contextMenu = null;
      return;
    }
    const publicId = this.game.publicIdForPlayer(player);
    if (!publicId) {
      showToast(translateText("friends.player_account_unavailable"), "red");
      return;
    }
    const width = 220;
    const height = 104;
    this.contextMenu = {
      player,
      publicId,
      x: Math.min(event.clientX, window.innerWidth - width - 8),
      y: Math.min(event.clientY, window.innerHeight - height - 8),
    };
  }

  private async requestFriend(): Promise<void> {
    const target = this.contextMenu;
    this.contextMenu = null;
    if (!target || this.friendRequestPending) return;
    this.friendRequestPending = true;
    try {
      const result = await sendFriendRequest(target.publicId);
      if (typeof result === "string") {
        const key =
          result === "not_found"
            ? "friends.error_not_found"
            : result === "conflict"
              ? "friends.error_conflict"
              : result === "bad_request"
                ? "friends.error_bad_request"
                : "friends.error_generic";
        showToast(translateText(key), "red");
        return;
      }
      showToast(
        translateText(
          result.status === "accepted"
            ? "friends.request_auto_accepted"
            : "friends.request_sent",
        ),
        "green",
      );
    } finally {
      this.friendRequestPending = false;
    }
  }

  private async blockContextPlayer(): Promise<void> {
    const target = this.contextMenu;
    this.contextMenu = null;
    if (!target) return;
    const result = await blockPlayer(target.publicId);
    showToast(
      translateText(
        result === true ? "friends.player_blocked" : "friends.error_generic",
      ),
      result === true ? "green" : "red",
    );
  }

  private async requestFriendForPlayer(
    event: MouseEvent,
    player: PlayerView,
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.openPlayerMenu(event, player);
    await this.requestFriend();
  }

  render() {
    if (!this.visible) {
      return html``;
    }
    return html`
      <div
        class="${this.showTopFive
          ? "max-h-[14rem]"
          : "max-h-[60vh]"} overflow-y-auto text-white text-xs md:text-xs lg:text-sm mt-2 ${this
          .visible
          ? ""
          : "hidden"}"
        @contextmenu=${(e: Event) => e.preventDefault()}
      >
        <div
          class="ob-command ob-command--leaderboard grid w-full text-xs md:text-xs lg:text-sm rounded-md overflow-hidden"
          style="grid-template-columns: minmax(24px, 30px) minmax(60px, 100px) minmax(45px, 70px) minmax(40px, 55px) minmax(55px, 105px);"
        >
          <div class="contents font-bold bg-gray-700/60">
            <div class="py-1 md:py-2 text-center border-b border-slate-500">
              #
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-slate-500 truncate"
            >
              ${translateText("leaderboard.player")}
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-slate-500 cursor-pointer whitespace-nowrap truncate"
              @click=${() => this.setSort("tiles")}
            >
              ${translateText("leaderboard.owned")}
              ${this._sortKey === "tiles"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-slate-500 cursor-pointer whitespace-nowrap truncate"
              @click=${() => this.setSort("gold")}
            >
              ${translateText("leaderboard.gold")}
              ${this._sortKey === "gold"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
            <div
              class="py-1 md:py-2 text-center border-b border-slate-500 cursor-pointer whitespace-nowrap truncate"
              @click=${() => this.setSort("maxtroops")}
            >
              ${translateText("leaderboard.maxtroops")}
              ${this._sortKey === "maxtroops"
                ? this._sortOrder === "asc"
                  ? "⬆️"
                  : "⬇️"
                : ""}
            </div>
          </div>

          ${repeat(
            this.players,
            (p) => p.player.id(),
            (player, index) => html`
              <div
                class="contents hover:bg-slate-700 ${player.isMyPlayer
                  ? "ob-command--local"
                  : ""} ${player.isOnSameTeam
                  ? "font-bold"
                  : ""} cursor-pointer"
                @click=${() => this.handleRowClickPlayer(player.player)}
                @dblclick=${(event: MouseEvent) =>
                  void this.requestFriendForPlayer(event, player.player)}
                @contextmenu=${(event: MouseEvent) =>
                  this.openPlayerMenu(event, player.player)}
              >
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-slate-500"
                    : ""}"
                >
                  ${player.position}
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-slate-500"
                    : ""} truncate"
                >
                  <span class="inline-flex max-w-full items-center gap-1.5">
                    <player-avatar
                      size="1.5rem"
                      .src=${player.profilePictureUrl ?? undefined}
                      .label=${player.name}
                    ></player-avatar>
                    <span class="truncate">${player.name}</span>
                  </span>
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-slate-500"
                    : ""}"
                >
                  ${player.score}
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-slate-500"
                    : ""}"
                >
                  ${player.gold}
                </div>
                <div
                  class="py-1 md:py-2 text-center ${index <
                  this.players.length - 1
                    ? "border-b border-slate-500"
                    : ""}"
                >
                  ${player.maxTroops}
                </div>
              </div>
            `,
          )}
        </div>
      </div>

      <button
        class="mt-2 p-0.5 px-1.5 md:px-2 text-xs md:text-xs lg:text-sm 
        border rounded-md border-slate-500 transition-colors
        text-white mx-auto block hover:bg-white/10 bg-gray-700/50"
        @click=${() => {
          this.showTopFive = !this.showTopFive;
          this.updateLeaderboard();
        }}
      >
        ${this.showTopFive ? "+" : "-"}
      </button>
      ${this.contextMenu
        ? html`
            <div
              class="fixed inset-0 z-[10020]"
              @pointerdown=${() => (this.contextMenu = null)}
              @contextmenu=${(event: Event) => {
                event.preventDefault();
                this.contextMenu = null;
              }}
            >
              <div
                class="fixed min-w-[210px] overflow-hidden rounded-lg border border-cyan-500/50 bg-slate-950 shadow-2xl"
                style="left:${this.contextMenu.x}px; top:${this.contextMenu
                  .y}px"
                @pointerdown=${(event: Event) => event.stopPropagation()}
              >
                <button
                  class="block w-full px-4 py-3 text-left font-bold text-white hover:bg-slate-800"
                  @click=${() => void this.requestFriend()}
                >
                  ${translateText("friends.send_to_player", {
                    player: this.contextMenu.player.displayName(),
                  })}
                </button>
                <button
                  class="block w-full border-t border-white/10 px-4 py-3 text-left font-bold text-red-300 hover:bg-red-950/50"
                  @click=${() => void this.blockContextPlayer()}
                >
                  ${translateText("friends.block_player", {
                    player: this.contextMenu.player.displayName(),
                  })}
                </button>
              </div>
            </div>
          `
        : ""}
    `;
  }
}
