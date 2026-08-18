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
import { triggerSunBlast } from "../../openback/SunBlast";
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
      ${this.renderPlasterSun()}
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
            @click=${this._handleKeepPlaying}
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

  /** Set once the player chose to keep playing after the sun went up. */
  @state() private keptPlayingAfterBlast = false;

  private _handleKeepPlaying = () => {
    this.keptPlayingAfterBlast = true;
    this.hide();
  };

  /**
   * Shown after the match is over and the player stayed anyway. The sun is
   * wearing a plaster because it already exploded.
   */
  private renderPlasterSun() {
    if (!this.keptPlayingAfterBlast) return null;
    return html`
      <div
        class="pointer-events-none fixed inset-x-0 top-16 z-[9000] flex flex-col items-center gap-3 px-4"
      >
        <svg viewBox="0 0 120 120" class="h-24 w-24 drop-shadow-lg">
          <g stroke="#f6c453" stroke-width="7" stroke-linecap="round">
            <line x1="60" y1="8" x2="60" y2="24" />
            <line x1="60" y1="96" x2="60" y2="112" />
            <line x1="8" y1="60" x2="24" y2="60" />
            <line x1="96" y1="60" x2="112" y2="60" />
            <line x1="23" y1="23" x2="34" y2="34" />
            <line x1="86" y1="86" x2="97" y2="97" />
            <line x1="23" y1="97" x2="34" y2="86" />
            <line x1="86" y1="34" x2="97" y2="23" />
          </g>
          <circle cx="60" cy="60" r="30" fill="#ffd764" />
          <!-- the plaster -->
          <g transform="rotate(-28 60 58)">
            <rect
              x="34"
              y="49"
              width="52"
              height="18"
              rx="9"
              fill="#f3e2c7"
              stroke="#d9c3a1"
              stroke-width="2"
            />
            <rect x="52" y="51" width="16" height="14" rx="4" fill="#e7d2b0" />
          </g>
          <circle cx="49" cy="72" r="2.6" fill="#8a6a1f" />
          <circle cx="71" cy="72" r="2.6" fill="#8a6a1f" />
        </svg>
        <p
          class="max-w-3xl rounded-2xl bg-black/70 px-5 py-3 text-center text-xl font-semibold leading-snug text-white sm:text-2xl"
        >
          ${translateText("win_modal.sun_already_exploded")}
        </p>
      </div>
    `;
  }

  show() {
    crazyGamesSDK.gameplayStop();
    // The match is over: send the sun up and let it go. The renderer samples
    // this; with the sky hidden in settings it simply does nothing visible.
    triggerSunBlast();
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
