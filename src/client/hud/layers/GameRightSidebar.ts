import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { assetUrl } from "../../../core/AssetUrls";
import { EventBus } from "../../../core/EventBus";
import { GameType } from "../../../core/game/Game";
import { createNextLobby } from "../../Api";
import { ClientEnv } from "../../ClientEnv";
import "../../components/DoomsdayClockPanel";
import "../../components/OvertimePanel";
import { Controller } from "../../Controller";
import { crazyGamesSDK } from "../../CrazyGamesSDK";
import { showInGameAlert, showInGameConfirm } from "../../InGameModal";
import { TogglePauseIntentEvent } from "../../InputHandler";
import { shouldConfirmLeaving } from "../../openback/LeaveGuard";
import { UpdateSuspensionEvent } from "../../openback/UpdateWatcher";
import { PauseGameIntentEvent, SendWinnerEvent } from "../../Transport";
import { showToast, translateText } from "../../Utils";
import { GameView } from "../../view";
import { ImmunityBarVisibleEvent } from "./ImmunityTimer";
import { ShowReplayPanelEvent } from "./ReplayPanel";
import { ShowSettingsModalEvent } from "./SettingsModal";
import { SpawnBarVisibleEvent } from "./SpawnTimer";
const exitIcon = assetUrl("images/ExitIconWhite.svg");
const FastForwardIconSolid = assetUrl("images/FastForwardIconSolidWhite.svg");
const pauseIcon = assetUrl("images/PauseIconWhite.svg");
const playIcon = assetUrl("images/PlayIconWhite.svg");
const newLobbyIcon = assetUrl("images/ReplayRegularIconWhite.svg");
const settingsIcon = assetUrl("images/SettingIconWhite.svg");
const fullscreenIcon = assetUrl("images/FullscreenIconWhite.svg");
const exitFullscreenIcon = assetUrl("images/ExitFullscreenIconWhite.svg");
const landscapeIcon = assetUrl("images/LandscapeIconWhite.svg");

const LAST_MINUTE_SECONDS = 60;
const FLASH_TIMER_SECONDS = 30;
const FLASH_SIDEBAR_SECONDS = 10;
const ONE_MINUTE_WARNING_DURATION_MS = 4_000;

@customElement("game-right-sidebar")
export class GameRightSidebar extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;

  @state()
  private _isSinglePlayer: boolean = false;

  @state()
  private _isReplayVisible: boolean = false;

  @state()
  private _isVisible: boolean = true;

  @state()
  private isPaused: boolean = false;

  @state()
  private isFullscreen: boolean = false;

  @state()
  private showLandscapeControl: boolean = false;

  @state()
  private timer: number = 0;

  // CrazyGames provides its own fullscreen control in the game frame, so hide ours.
  private readonly onCrazyGames = crazyGamesSDK.isOnCrazyGames();
  private hasWinner = false;
  private isLobbyCreator = false;
  private isPrivateLobby = false;
  private hasShownOneMinuteWarning = false;
  // Guards the in-game "New lobby" button so a double click doesn't fire twice
  // before we navigate to the successor lobby.
  private newLobbyRequested = false;
  private spawnBarVisible = false;
  private immunityBarVisible = false;
  private pausedByUpdate = false;

  createRenderRoot() {
    // Stack the timer bar + doomsday-clock readout, centers aligned (the narrower
    // one sits centered under the wider one).
    //
    // Kept centred: the bar itself asks for the full width on a phone, and the
    // narrower doomsday readout stays centred under it.
    this.style.display = "flex";
    this.style.flexDirection = "column";
    this.style.alignItems = "center";
    this.style.gap = "6px";
    return this;
  }

  init() {
    this._isSinglePlayer =
      this.game?.config()?.gameConfig()?.gameType === GameType.Singleplayer ||
      this.game.config().isReplay();
    this.isPrivateLobby =
      this.game?.config()?.gameConfig()?.gameType === GameType.Private;
    this._isVisible = true;
    this.hasShownOneMinuteWarning = false;

    this.eventBus.on(SpawnBarVisibleEvent, (e) => {
      this.spawnBarVisible = e.visible;
      this.updateParentOffset();
    });
    this.eventBus.on(ImmunityBarVisibleEvent, (e) => {
      this.immunityBarVisible = e.visible;
      this.updateParentOffset();
    });

    this.eventBus.on(SendWinnerEvent, () => {
      this.hasWinner = true;
      this.requestUpdate();
    });

    this.eventBus.on(TogglePauseIntentEvent, () => {
      const isReplayOrSingleplayer =
        this._isSinglePlayer || this.game?.config()?.isReplay();
      if (
        isReplayOrSingleplayer ||
        (this.isLobbyCreator && !this.game.config().listed)
      ) {
        this.onPauseButtonClick();
      }
    });
    this.eventBus.on(UpdateSuspensionEvent, (event) =>
      this.onUpdateSuspension(event.suspended),
    );

    this.requestUpdate();
  }

  private onFullscreenChange = () => {
    this.isFullscreen = !!document.fullscreenElement;
    this.updateOrientationState();
  };

  private isTouchPrimary(): boolean {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches
    );
  }

  private updateOrientationState = () => {
    const touchPrimary = this.isTouchPrimary();
    const portrait = window.innerHeight > window.innerWidth;
    const next = touchPrimary && portrait;
    if (this.showLandscapeControl !== next) {
      this.showLandscapeControl = next;
      this.requestUpdate();
    }
  };

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    window.addEventListener("resize", this.updateOrientationState);
    screen.orientation?.addEventListener?.(
      "change",
      this.updateOrientationState,
    );
    this.onFullscreenChange();
    this.updateOrientationState();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    window.removeEventListener("resize", this.updateOrientationState);
    screen.orientation?.removeEventListener?.(
      "change",
      this.updateOrientationState,
    );
  }

  getTickIntervalMs() {
    return 250;
  }

  tick() {
    // Timer logic
    // Check if the player is the lobby creator
    if (!this.isLobbyCreator && this.game.myPlayer()?.isLobbyCreator()) {
      this.isLobbyCreator = true;
      this.requestUpdate();
    }

    if (this.game.inSpawnPhase()) {
      // Singleplayer has no spawn timer (SpawnTimerExecution isn't added), so
      // the spawn phase doesn't count down — keep the old static display.
      if (this.game.config().gameConfig().gameType === GameType.Singleplayer) {
        const maxTimerValue = this.game.config().gameConfig().maxTimerValue;
        this.timer =
          maxTimerValue !== null && maxTimerValue !== undefined
            ? maxTimerValue * 60
            : 0;
        return;
      }
      const spawnPhaseDurationTicks = this.game.config().numSpawnPhaseTurns();
      const currentTicks = this.game.ticks();
      const remainingTicks = spawnPhaseDurationTicks - currentTicks;
      const remainingSeconds = Math.ceil(remainingTicks / 10);
      this.timer = Math.max(0, remainingSeconds);
      return;
    }

    const elapsedSeconds = Math.floor(this.game.elapsedGameSeconds());

    if (this.hasWinner) {
      return;
    }

    const maxTimerValue = this.game.config().gameConfig().maxTimerValue;
    if (maxTimerValue !== null && maxTimerValue !== undefined) {
      this.timer = Math.max(0, maxTimerValue * 60 - elapsedSeconds);
      this.maybeShowOneMinuteWarning();
    } else {
      this.timer = elapsedSeconds;
    }
  }

  // Handing the notice to the heads-up toast layer means that layer owns the
  // dismissal timer, so there's nothing for us to tear down on disconnect or
  // when the game ends.
  private maybeShowOneMinuteWarning(): void {
    if (
      !this.hasWinner &&
      !this.game.inSpawnPhase() &&
      this.timer > 0 &&
      this.timer <= LAST_MINUTE_SECONDS &&
      !this.hasShownOneMinuteWarning
    ) {
      this.hasShownOneMinuteWarning = true;
      showToast(
        translateText("game_timer.one_minute_remaining"),
        "red",
        ONE_MINUTE_WARNING_DURATION_MS,
      );
    }
  }

  private updateParentOffset(): void {
    const offset =
      (this.spawnBarVisible ? 7 : 0) + (this.immunityBarVisible ? 7 : 0);
    const parent = this.parentElement as HTMLElement;
    if (parent) {
      parent.style.marginTop = `${offset}px`;
    }
  }

  private secondsToHms = (d: number): string => {
    const pad = (n: number) => (n < 10 ? `0${n}` : n);

    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);

    if (h !== 0) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    } else {
      return `${pad(m)}:${pad(s)}`;
    }
  };

  private toggleReplayPanel(): void {
    this._isReplayVisible = !this._isReplayVisible;
    this.eventBus.emit(
      new ShowReplayPanelEvent(this._isReplayVisible, this._isSinglePlayer),
    );
  }

  private onPauseButtonClick() {
    this.setPaused(!this.isPaused);
  }

  private setPaused(paused: boolean): void {
    if (this.isPaused === paused) return;
    this.isPaused = paused;
    if (this.isPaused) {
      crazyGamesSDK.gameplayStop();
    } else {
      crazyGamesSDK.gameplayStart();
    }
    this.eventBus.emit(new PauseGameIntentEvent(this.isPaused));
  }

  private onUpdateSuspension(suspended: boolean): void {
    if (suspended) {
      if (this.isPaused) {
        this.pausedByUpdate = false;
        return;
      }
      const canPause =
        this._isSinglePlayer ||
        (this.isPrivateLobby &&
          this.game.myPlayer()?.isLobbyCreator() === true &&
          !this.game.config().listed);
      this.pausedByUpdate = canPause;
      if (canPause) this.setPaused(true);
      return;
    }
    if (!this.pausedByUpdate) return;
    this.pausedByUpdate = false;
    this.setPaused(false);
  }

  private async onNewLobbyButtonClick() {
    if (this.newLobbyRequested) return;
    // Confirm so a stray click next to pause/exit doesn't yank everyone into a
    // new lobby mid-game.
    const isConfirmed = await showInGameConfirm(
      translateText("new_lobby_prompt.confirm"),
      { variant: "warning" },
    );
    if (!isConfirmed) return;
    if (this.newLobbyRequested) return; // clicked again while confirming
    this.newLobbyRequested = true;
    this.requestUpdate();
    try {
      // The worker mints the successor lobby and has the current game
      // broadcast its id, so everyone else gets the NewLobbyPrompt. We (the
      // host) navigate straight to the new host view from the response.
      const lobby = await createNextLobby(this.game.gameID());
      const id = lobby.gameID;
      // ?host routes the creator back into the host view on load.
      window.location.href = `${window.location.origin}/${ClientEnv.workerPath(id)}/game/${id}?host`;
    } catch (error) {
      console.error("Failed to create successor lobby", error);
      this.newLobbyRequested = false;
      this.requestUpdate();
      void showInGameAlert(translateText("new_lobby_prompt.failed"));
    }
  }

  private async onExitButtonClick() {
    // Ask unless we positively know the player is already out.
    //
    // myPlayer() is null until the client has resolved the local player, so on
    // a slow or laggy load `?.isAlive()` was undefined and the old truthiness
    // check read "still loading" as "already dead" and left the match with no
    // confirmation at all.
    if (shouldConfirmLeaving(this.game?.myPlayer() ?? null)) {
      const isConfirmed = await showInGameConfirm(
        translateText("help_modal.exit_confirmation"),
      );
      if (!isConfirmed) return;
    }
    await crazyGamesSDK.requestMidgameAd();
    await crazyGamesSDK.gameplayStop();
    // redirect to the home page
    window.location.href = "/";
  }

  private onSettingsButtonClick() {
    this.eventBus.emit(
      new ShowSettingsModalEvent(true, this._isSinglePlayer, this.isPaused),
    );
  }

  private onTutorialButtonClick() {
    document.dispatchEvent(new CustomEvent("open-player-tutorial"));
  }

  private async requestLandscapeMode(): Promise<boolean> {
    try {
      if (!document.fullscreenElement && document.fullscreenEnabled) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: OrientationLockType) => Promise<void>;
      };
      if (typeof orientation?.lock === "function") {
        await orientation.lock("landscape");
        return true;
      }
    } catch (error) {
      console.warn("Failed to request landscape orientation:", error);
    }
    showToast(translateText("mobile_orientation.enable_auto_rotate"), "green");
    return false;
  }

  private async onFullscreenButtonClick() {
    if (!document.fullscreenElement) {
      if (this.isTouchPrimary()) {
        await this.requestLandscapeMode();
      } else {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn("Failed to enter fullscreen:", err);
        });
      }
    } else {
      screen.orientation?.unlock?.();
      document.exitFullscreen().catch((err) => {
        console.warn("Failed to exit fullscreen:", err);
      });
    }
  }

  render() {
    if (this.game === undefined) return html``;

    const maxTimerValue = this.game.config().gameConfig().maxTimerValue;
    const isEndTimerActive =
      maxTimerValue !== undefined &&
      maxTimerValue !== null &&
      !this.game.inSpawnPhase() &&
      !this.hasWinner &&
      this.timer > 0;
    const isLastMinute = isEndTimerActive && this.timer <= LAST_MINUTE_SECONDS;
    const shouldFlashTimer =
      isEndTimerActive && this.timer <= FLASH_TIMER_SECONDS;
    const shouldFlashSidebar =
      isEndTimerActive && this.timer <= FLASH_SIDEBAR_SECONDS;

    const timerClass = shouldFlashTimer
      ? "game-end-timer-flash"
      : isLastMinute
        ? "game-end-timer-last-minute"
        : "";

    return html`
      <style>
        @keyframes game-end-timer-text-flash {
          0%,
          100% {
            color: rgb(248 113 113);
          }
          50% {
            color: white;
          }
        }
        @keyframes game-end-timer-sidebar-flash {
          0%,
          100% {
            background-color: rgb(0 0 0 / 0.92);
          }
          50% {
            background-color: rgb(185 28 28 / 0.96);
          }
        }
        .game-end-timer-last-minute {
          color: rgb(248 113 113);
        }
        .game-end-timer-flash {
          animation: game-end-timer-text-flash 1s ease-in-out infinite;
        }
        .game-end-timer-sidebar-flash {
          animation: game-end-timer-sidebar-flash 1s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .game-end-timer-flash {
            animation: none;
            color: white;
          }
          .game-end-timer-sidebar-flash {
            animation: none;
            background-color: rgb(185 28 28 / 0.96);
          }
        }
      </style>
      <aside
        class=${`w-full justify-between min-[1200px]:w-fit min-[1200px]:justify-start flex flex-row items-center gap-2 min-[1200px]:gap-3 py-2 px-3 bg-gray-800/92 backdrop-blur-sm shadow-xs min-[1200px]:rounded-lg rounded-bl-lg transition-transform duration-300 ease-out transform text-white ${shouldFlashSidebar ? "game-end-timer-sidebar-flash" : ""} ${
          this._isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        @contextmenu=${(e: Event) => e.preventDefault()}
      >
        <!-- In-game time -->
        <div data-game-timer class=${timerClass}>
          ${this.secondsToHms(this.timer)}
        </div>

        <!-- Buttons -->
        ${this.maybeRenderReplayButtons()}

        <div class="cursor-pointer" @click=${this.onSettingsButtonClick}>
          <img src=${settingsIcon} alt="settings" width="20" height="20" />
        </div>

        <button
          type="button"
          data-tutorial-entry="in-game"
          class="cursor-pointer border-0 bg-transparent p-0 text-white"
          aria-label=${translateText("main.tutorials")}
          title=${translateText("main.tutorials")}
          @click=${this.onTutorialButtonClick}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            width="20"
            height="20"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4"></path>
            <line x1="12" y1="17.5" x2="12.01" y2="17.5"></line>
          </svg>
        </button>

        ${
          this.showLandscapeControl
            ? html`<button
                type="button"
                class="cursor-pointer border-0 bg-transparent p-0"
                aria-label=${translateText("mobile_orientation.enter_landscape")}
                title=${translateText("mobile_orientation.enter_landscape")}
                @click=${this.requestLandscapeMode}
              >
                <img src=${landscapeIcon} alt="" width="20" height="20" />
              </button>`
            : ""
        }
        ${
          document.fullscreenEnabled && !this.onCrazyGames
            ? html`<div
                class="cursor-pointer"
                @click=${this.onFullscreenButtonClick}
              >
                <img
                  src=${this.isFullscreen ? exitFullscreenIcon : fullscreenIcon}
                  alt=${
                    this.isFullscreen
                      ? translateText("fullscreen.exit")
                      : translateText("fullscreen.enter")
                  }
                  width="20"
                  height="20"
                />
              </div>`
            : ""
        }

        <div class="cursor-pointer" @click=${this.onExitButtonClick}>
          <img src=${exitIcon} alt="exit" width="20" height="20" />
        </div>
      </aside>
      <doomsday-clock-panel
        .game=${this.game}
        .hasWinner=${this.hasWinner}
        .refreshKey=${this.timer}
      ></doomsday-clock-panel>
      <overtime-panel
        .game=${this.game}
        .hasWinner=${this.hasWinner}
        .refreshKey=${this.timer}
      ></overtime-panel>
    `;
  }

  maybeRenderReplayButtons() {
    const isReplayOrSingleplayer =
      this._isSinglePlayer || this.game?.config()?.isReplay();
    const showPauseButton =
      isReplayOrSingleplayer ||
      (this.isLobbyCreator && !this.game.config().listed);
    // The host of a private lobby can start a fresh lobby at any time, without
    // waiting to die or for the game to end.
    const showNewLobbyButton = this.isLobbyCreator && this.isPrivateLobby;

    return html`
      ${
        isReplayOrSingleplayer
          ? html`
              <div class="cursor-pointer" @click=${this.toggleReplayPanel}>
                <img
                  src=${FastForwardIconSolid}
                  alt="replay"
                  width="20"
                  height="20"
                />
              </div>
            `
          : ""
      }
      ${
        showPauseButton
          ? html`
              <div class="cursor-pointer" @click=${this.onPauseButtonClick}>
                <img
                  src=${this.isPaused ? playIcon : pauseIcon}
                  alt="play/pause"
                  width="20"
                  height="20"
                />
              </div>
            `
          : ""
      }
      ${
        showNewLobbyButton
          ? html`
              <div
                class="cursor-pointer ${
                  this.newLobbyRequested ? "opacity-50 pointer-events-none" : ""
                }"
                @click=${this.onNewLobbyButtonClick}
                title=${translateText("win_modal.new_lobby")}
              >
                <img
                  src=${newLobbyIcon}
                  alt=${translateText("win_modal.new_lobby")}
                  width="20"
                  height="20"
                />
              </div>
            `
          : ""
      }
    `;
  }
}
