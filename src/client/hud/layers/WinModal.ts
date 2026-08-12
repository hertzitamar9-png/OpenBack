import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText, TUTORIAL_VIDEO_URL } from "../../../client/Utils";
import { assetUrl } from "../../../core/AssetUrls";
import { EventBus } from "../../../core/EventBus";
import { RankedType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { getUserMe, markDeathTutorialSeen } from "../../Api";
import { Controller } from "../../Controller";
import { crazyGamesSDK } from "../../CrazyGamesSDK";
import { DeathMedia, selectDeathMedia } from "../../DeathMedia";
import { SendWinnerEvent } from "../../Transport";
import { GameView } from "../../view";

@customElement("win-modal")
export class WinModal extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;

  private hasShownDeathModal = false;

  @state()
  isVisible = false;

  @state()
  showButtons = false;

  @state()
  private isWin = false;

  @state()
  private isRankedGame = false;

  @state()
  private deathMedia: DeathMedia | null = null;

  private _title: string;

  // Override to prevent shadow DOM creation
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
  }

  render() {
    return html`
      <div
        class="${this.isVisible
          ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800/70 p-4 md:p-6 shrink-0 rounded-lg z-[10010] shadow-2xl backdrop-blur-xs text-white w-[min(90vw,700px)] max-w-[90%] max-h-[90dvh] overflow-hidden flex flex-col"
          : "hidden"}"
      >
        <h2 class="m-0 mb-4 text-[26px] text-center text-white shrink-0">
          ${this._title || ""}
        </h2>
        ${this.renderDeathMedia()}
        <div
          class="${this.showButtons
            ? "mt-4 flex justify-between gap-2.5 shrink-0"
            : "hidden"}"
        >
          <o-button
            variant="primary"
            width="block"
            class="flex-1"
            translationKey="win_modal.exit"
            @click=${this._handleExit}
          ></o-button>
          ${this.isRankedGame
            ? html`
                <o-button
                  variant="primary"
                  width="block"
                  class="flex-1"
                  translationKey="win_modal.requeue"
                  @click=${this._handleRequeue}
                ></o-button>
              `
            : null}
          <o-button
            variant="primary"
            width="block"
            class="flex-1"
            .title=${this.game?.myPlayer()?.isAlive()
              ? translateText("win_modal.keep")
              : translateText("win_modal.spectate")}
            @click=${this.hide}
          ></o-button>
        </div>
      </div>
    `;
  }

  private renderDeathMedia() {
    if (!this.deathMedia) return null;
    return html`
      <div
        class="relative mb-4 aspect-video w-full shrink-0 overflow-hidden rounded-md bg-black"
      >
        ${this.deathMedia === "tutorial"
          ? html`
              <iframe
                class="absolute inset-0 h-full w-full border-0"
                src=${this.isVisible ? TUTORIAL_VIDEO_URL : ""}
                title=${translateText("win_modal.youtube_tutorial")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            `
          : html`
              <img
                class="absolute inset-0 h-full w-full object-contain"
                src=${assetUrl("images/OpenBackSocialPreview.png")}
                alt="OpenBack battle"
              />
            `}
      </div>
    `;
  }

  private async showDeath() {
    this.deathMedia = await selectDeathMedia(
      await getUserMe(),
      markDeathTutorialSeen,
    );
    this.show();
  }

  show() {
    crazyGamesSDK.gameplayStop();
    // Check if this is a ranked game
    this.isRankedGame =
      this.game.config().gameConfig().rankedType !== undefined;
    this.isVisible = true;
    this.requestUpdate();
    setTimeout(() => {
      this.showButtons = true;
      this.requestUpdate();
    }, 3000);
  }

  hide() {
    this.isVisible = false;
    this.showButtons = false;
    this.deathMedia = null;
    this.requestUpdate();
  }

  private _handleExit() {
    this.hide();
    window.location.href = "/";
  }

  private _handleRequeue() {
    this.hide();
    // Requeue for the same mode; Main owns the mechanism (currently a
    // reload with the requeue param, which reopens the queue after the
    // page teardown).
    document.dispatchEvent(
      new CustomEvent("matchmaking-requeue", {
        detail: {
          mode:
            this.game.config().gameConfig().rankedType === RankedType.TwoVTwo
              ? ("2v2" as const)
              : ("1v1" as const),
        },
      }),
    );
  }

  init() {}

  tick() {
    const myPlayer = this.game.myPlayer();
    if (
      !this.hasShownDeathModal &&
      myPlayer &&
      !myPlayer.isAlive() &&
      !this.game.inSpawnPhase() &&
      myPlayer.hasSpawned()
    ) {
      this.hasShownDeathModal = true;
      this._title = translateText("win_modal.died");
      void this.showDeath();
    }
    const updates = this.game.updatesSinceLastTick();
    const winUpdates = updates !== null ? updates[GameUpdateType.Win] : [];
    winUpdates.forEach((wu) => {
      if (wu.winner === undefined) {
        // Match cancelled (e.g. a ranked 2v2 that didn't fill or fully
        // spawn): the game ends with no winner. Still vote the result to the
        // server so the record is archived winnerless (never ranked).
        this.eventBus.emit(new SendWinnerEvent(undefined, wu.allPlayersStats));
        this._title = translateText("win_modal.match_cancelled");
        this.isWin = false;
        history.replaceState(null, "", `${window.location.pathname}?replay`);
        this.show();
      } else if (wu.winner[0] === "team") {
        this.eventBus.emit(new SendWinnerEvent(wu.winner, wu.allPlayersStats));
        if (wu.winner[1] === this.game.myPlayer()?.team()) {
          this._title = translateText("win_modal.your_team");
          this.isWin = true;
          crazyGamesSDK.happytime();
        } else {
          this._title = translateText("win_modal.other_team", {
            team: wu.winner[1],
          });
          this.isWin = false;
        }
        history.replaceState(null, "", `${window.location.pathname}?replay`);
        this.show();
      } else if (wu.winner[0] === "nation") {
        this.eventBus.emit(new SendWinnerEvent(wu.winner, wu.allPlayersStats));
        this._title = translateText("win_modal.nation_won", {
          nation: wu.winner[1],
        });
        this.isWin = false;
        this.show();
      } else {
        const winner = this.game.playerByClientID(wu.winner[1]);
        if (!winner?.isPlayer()) return;
        const winnerClient = winner.clientID();
        if (winnerClient !== null) {
          this.eventBus.emit(
            new SendWinnerEvent(["player", winnerClient], wu.allPlayersStats),
          );
        }
        if (
          winnerClient !== null &&
          winnerClient === this.game.myPlayer()?.clientID()
        ) {
          this._title = translateText("win_modal.you_won");
          this.isWin = true;
          crazyGamesSDK.happytime();
        } else {
          this._title = translateText("win_modal.other_won", {
            player: winner.displayName(),
          });
          this.isWin = false;
        }
        history.replaceState(null, "", `${window.location.pathname}?replay`);
        this.show();
      }
    });
  }
}
