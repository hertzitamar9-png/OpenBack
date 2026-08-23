import { html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ClientEnv } from "src/client/ClientEnv";
import {
  Duos,
  GameMapType,
  GameMode,
  HumansVsNations,
  Quads,
  Trios,
} from "../core/game/Game";
import { ExperienceMode, PublicGameInfo, PublicGames } from "../core/Schemas";
import { appRouter } from "./AppRouter";
import "./components/ExperienceSwitch";
import "./components/IOSAddToHomeScreenBanner";
import { experienceContext } from "./ExperienceContext";
import { HostLobbyModal } from "./HostLobbyModal";
import { JoinLobbyModal } from "./JoinLobbyModal";
import { requireLifetimeAccess } from "./LifetimeAccess";
import { PublicLobbySocket } from "./LobbySocket";
import { JoinLobbyEvent } from "./Main";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";
import { UsernameInput } from "./UsernameInput";
import {
  calculateServerTimeOffset,
  getMapName,
  getModifierLabels,
  getSecondsUntilServerTimestamp,
  renderDuration,
  translateText,
} from "./Utils";

const CARD_BG = "bg-surface";

@customElement("game-mode-selector")
export class GameModeSelector extends LitElement {
  @state() private lobbies: PublicGames | null = null;
  @state() private mapAspectRatios: Map<GameMapType, number> = new Map();
  @state() private inputValid: boolean = true;
  @state() private experienceMode: ExperienceMode = experienceContext.get();
  private serverTimeOffset: number = 0;
  private defaultLobbyTime: number = 0;

  private lobbySocket = new PublicLobbySocket((lobbies) =>
    this.handleLobbiesUpdate(lobbies),
  );

  createRenderRoot() {
    return this;
  }

  // Silent backstop; the buttons are already disabled while input is invalid.
  private validateUsername(): boolean {
    const usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput | null;
    return usernameInput ? usernameInput.canPlay() : true;
  }

  connectedCallback() {
    super.connectedCallback();
    this.lobbySocket.start();
    this.defaultLobbyTime = ClientEnv.gameCreationRate() / 1000;
    window.addEventListener(
      "username-validity-change",
      this.handleValidityChange,
    );
    window.addEventListener("experience-changed", this.handleExperienceChanged);
    // Pick up the current value in case username-input validated before us.
    const usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput | null;
    if (usernameInput) {
      this.inputValid = usernameInput.canPlay();
    }
  }

  disconnectedCallback() {
    this.stop();
    window.removeEventListener(
      "username-validity-change",
      this.handleValidityChange,
    );
    window.removeEventListener(
      "experience-changed",
      this.handleExperienceChanged,
    );
    super.disconnectedCallback();
  }

  private handleValidityChange = (e: Event) => {
    this.inputValid = (e as CustomEvent).detail?.isValid ?? true;
  };

  private handleExperienceChanged = (event: Event) => {
    this.experienceMode = (
      event as CustomEvent<{ mode: ExperienceMode }>
    ).detail.mode;
  };

  private selectExperience = (event: Event) => {
    const mode = (event as CustomEvent<{ mode: ExperienceMode }>).detail.mode;
    experienceContext.select(mode, "user");
    this.experienceMode = mode;
    void appRouter.navigate(
      { pageId: "page-play", experienceMode: mode },
      { replace: true },
    );
  };

  public stop() {
    this.lobbySocket.stop();
  }

  private handleLobbiesUpdate(lobbies: PublicGames) {
    this.lobbies = lobbies;
    this.serverTimeOffset = calculateServerTimeOffset(lobbies.serverTime);
    document.dispatchEvent(
      new CustomEvent("public-lobbies-update", {
        detail: { payload: lobbies },
      }),
    );
    this.requestUpdate();

    const allGames = Object.values(lobbies.games ?? {}).flat();
    for (const game of allGames) {
      const mapType = game.gameConfig?.gameMap as GameMapType;
      if (mapType && !this.mapAspectRatios.has(mapType)) {
        // New Map reference triggers Lit reactivity; placeholder ratio 1 lets
        // has() guard against duplicate in-flight fetches.
        this.mapAspectRatios = new Map(this.mapAspectRatios).set(mapType, 1);
        terrainMapFileLoader
          .getMapData(mapType)
          .manifest()
          .then((m: any) => {
            if (m?.map?.width && m?.map?.height) {
              this.mapAspectRatios = new Map(this.mapAspectRatios).set(
                mapType,
                m.map.width / m.map.height,
              );
            }
          })
          .catch((e) =>
            console.error(`Failed to load manifest for ${mapType}`, e),
          );
      }
    }
  }

  render() {
    const selectLobby = (lobbies: PublicGameInfo[] | undefined) =>
      lobbies?.find(
        (lobby) =>
          lobby.experienceMode === this.experienceMode ||
          (lobby.experienceMode === undefined &&
            (lobby.gameConfig?.experienceMode ?? "2d") === this.experienceMode),
      );
    const ffa = selectLobby(this.lobbies?.games?.["ffa"]);
    const teams = selectLobby(this.lobbies?.games?.["team"]);
    const special = selectLobby(this.lobbies?.games?.["special"]);
    const mobileLobbies = [special, ffa, teams].filter(
      (lobby): lobby is PublicGameInfo => lobby !== undefined,
    );

    return html`
      <div
        class="home-command-layout flex flex-col gap-3 sm:gap-4 w-full px-3 sm:px-0 mx-auto pb-3 sm:pb-0 touch-pan-y"
      >
        <experience-switch
          .mode=${this.experienceMode}
          @experience-select=${this.selectExperience}
        ></experience-switch>
        <!-- Solo: mobile only, top -->
        <div class="mobile-home-primary-actions lg:hidden h-14">
          ${this.renderSmallActionCard(
            translateText("main.solo"),
            this.openSinglePlayerModal,
            "bg-malibu-blue hover:bg-aquarius active:bg-malibu-blue/80 hover:scale-y-105 hover:scale-x-[1.01]",
          )}
        </div>
        <!-- Create/ranked/join: mobile only, below solo -->
        <div
          class="mobile-home-secondary-actions lg:hidden grid grid-cols-3 gap-2 h-14"
        >
          ${this.renderSmallActionCard(
            translateText("main.create"),
            this.openHostLobby,
            "bg-surface hover:brightness-[1.08] active:brightness-[0.95] hover:scale-105 hover:shadow-[var(--shadow-action-card-hover)]",
          )}
          ${this.renderSmallActionCard(
            translateText("mode_selector.ranked_title"),
            this.openRankedMenu,
            "bg-surface hover:brightness-[1.08] active:brightness-[0.95] hover:scale-105 hover:shadow-[var(--shadow-action-card-hover)]",
          )}
          ${this.renderSmallActionCard(
            translateText("main.join"),
            this.openJoinLobby,
            "bg-surface hover:brightness-[1.08] active:brightness-[0.95] hover:scale-105 hover:shadow-[var(--shadow-action-card-hover)]",
            this.hostedLobbyCount(),
          )}
        </div>
        <!-- iOS Add to Home Screen banner -->
        <ios-add-to-home-screen-banner
          class="no-crazygames"
        ></ios-add-to-home-screen-banner>

        <!-- Game cards grid -->
        ${this.lobbies === null
          ? html`<div
              class="home-lobby-loading flex items-center justify-center h-44 sm:h-[min(24rem,40vh)]"
            >
              <span
                class="w-24 h-24 border-[6px] border-blue-500/30 border-t-blue-500 rounded-full animate-spin"
              ></span>
            </div>`
          : html`<div
              class="home-lobby-grid grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 lg:h-[min(20rem,30vh)]"
            >
              <!-- Left col: main card (desktop only) -->
              ${ffa
                ? html`<div class="desktop-lobby-feature hidden lg:block">
                    ${this.renderLobbyCard(ffa, this.getLobbyTitle(ffa), true)}
                  </div>`
                : nothing}

              <!-- Right col: special + teams (desktop only) -->
              <div
                class="desktop-lobby-secondary hidden lg:flex lg:flex-col lg:gap-4"
              >
                ${special
                  ? html`<div class="flex-1 min-h-0">
                      ${this.renderSpecialLobbyCard(special)}
                    </div>`
                  : nothing}
                ${teams
                  ? html`<div class="flex-1 min-h-0">
                      ${this.renderLobbyCard(teams, this.getLobbyTitle(teams))}
                    </div>`
                  : nothing}
              </div>

              <!-- Phones show every live match at once: one featured card and
                   two compact cards below it. -->
              <div class="mobile-lobby-mosaic lg:hidden">
                ${mobileLobbies.map(
                  (lobby, index) => html`
                    <div
                      class=${index === 0
                        ? "mobile-lobby-feature"
                        : "mobile-lobby-secondary"}
                    >
                      ${this.renderLobbyCard(
                        lobby,
                        this.getLobbyTitle(lobby),
                        index === 0,
                      )}
                    </div>
                  `,
                )}
              </div>
            </div>`}

        <!-- Solo: full width, desktop only -->
        <div class="desktop-home-actions hidden lg:block h-14">
          ${this.renderSmallActionCard(
            translateText("main.solo"),
            this.openSinglePlayerModal,
            "bg-malibu-blue hover:bg-aquarius active:bg-malibu-blue/80 hover:scale-y-105 hover:scale-x-[1.01]",
          )}
        </div>
        <!-- Bottom row: create + ranked + join (desktop only) -->
        <div
          class="desktop-home-secondary-actions hidden lg:grid grid-cols-3 gap-4 h-14"
        >
          ${this.renderSmallActionCard(
            translateText("main.create"),
            this.openHostLobby,
            "bg-surface hover:brightness-[1.08] active:brightness-[0.95] hover:scale-105 hover:shadow-[var(--shadow-action-card-hover)]",
          )}
          ${this.renderSmallActionCard(
            translateText("mode_selector.ranked_title"),
            this.openRankedMenu,
            "bg-surface hover:brightness-[1.08] active:brightness-[0.95] hover:scale-105 hover:shadow-[var(--shadow-action-card-hover)]",
          )}
          ${this.renderSmallActionCard(
            translateText("main.join"),
            this.openJoinLobby,
            "bg-surface hover:brightness-[1.08] active:brightness-[0.95] hover:scale-105 hover:shadow-[var(--shadow-action-card-hover)]",
            this.hostedLobbyCount(),
          )}
        </div>
      </div>
    `;
  }

  private renderSpecialLobbyCard(lobby: PublicGameInfo) {
    return this.renderLobbyCard(lobby, this.getLobbyTitle(lobby));
  }

  private openRankedMenu = async () => {
    if (!this.validateUsername()) return;
    if (!(await requireLifetimeAccess("ranked"))) return;
    void appRouter.navigate({
      pageId: "page-ranked",
      experienceMode: this.experienceMode,
    });
  };

  private openSinglePlayerModal = () => {
    if (!this.validateUsername()) return;
    const modal = document.querySelector(
      "single-player-modal",
    ) as SinglePlayerModal | null;
    modal?.setExperienceMode(this.experienceMode);
    modal?.open();
  };

  private openHostLobby = async () => {
    if (!this.validateUsername()) return;
    if (!(await requireLifetimeAccess("multiplayer"))) return;
    const modal = document.querySelector(
      "host-lobby-modal",
    ) as HostLobbyModal | null;
    modal?.setExperienceMode(this.experienceMode);
    modal?.open();
  };

  private openJoinLobby = async () => {
    if (!this.validateUsername()) return;
    if (!(await requireLifetimeAccess("multiplayer"))) return;
    const modal = document.querySelector(
      "join-lobby-modal",
    ) as JoinLobbyModal | null;
    modal?.setExperienceMode(this.experienceMode);
    modal?.open({ experienceMode: this.experienceMode });
  };

  // Number of open hosted lobbies waiting in the browser; shown as a chip
  // on the Join button.
  private hostedLobbyCount(): number {
    return (
      this.lobbies?.games?.hosted?.filter(
        (lobby) => (lobby.experienceMode ?? "2d") === this.experienceMode,
      ).length ?? 0
    );
  }

  private renderSmallActionCard(
    title: string,
    onClick: () => void,
    bgClass: string = CARD_BG,
    badge?: number,
  ) {
    return html`
      <button
        @click=${onClick}
        ?disabled=${!this.inputValid}
        class="relative flex items-center justify-center w-full h-full rounded-lg px-1 ${bgClass} transition-all duration-200 text-[11px] leading-tight sm:text-sm lg:text-base font-semibold text-white uppercase tracking-[0.06em] sm:tracking-wider text-center ${!this
          .inputValid
          ? "opacity-50 cursor-not-allowed pointer-events-none"
          : ""}"
      >
        ${title}
        ${badge
          ? html`<span
              class="absolute -top-2 -right-2 min-w-[1.375rem] h-[1.375rem] px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold tracking-normal"
              >${badge}</span
            >`
          : nothing}
      </button>
    `;
  }

  private renderLobbyCard(
    lobby: PublicGameInfo,
    titleContent: string | TemplateResult,
    highResolution = false,
  ) {
    const mapType = lobby.gameConfig!.gameMap as GameMapType;
    const mapData = terrainMapFileLoader.getMapData(mapType);
    const mapImage1x =
      this.experienceMode === "3d"
        ? (mapData.webp3dPath ?? mapData.webpPath)
        : mapData.webpPath;
    const mapImage2x =
      this.experienceMode === "3d"
        ? (mapData.webp3d2xPath ?? mapImage1x)
        : (mapData.webp2xPath ?? mapImage1x);
    // The featured card is roughly twice as wide as either secondary card.
    // Density descriptors alone select the 300px 1x thumbnail on a DPR-1
    // display without considering that rendered width, which stretches it
    // across ~800px and makes only the big card blurry. Start that card from
    // the 2x asset; smaller cards retain the lighter density-aware pair.
    const mapImageSrc = highResolution ? mapImage2x : mapImage1x;
    const mapImageSrcset = highResolution
      ? `${mapImage2x} 1x`
      : `${mapImage1x} 1x, ${mapImage2x} 2x`;
    const aspectRatio = this.mapAspectRatios.get(mapType);
    // Use object-contain for extreme aspect ratios (e.g. Amazon River ~20:1) so
    // the full map is visible instead of being cropped by object-cover.
    const useContain =
      aspectRatio !== undefined && (aspectRatio > 4 || aspectRatio < 0.25);
    const timeRemaining = lobby.startsAt
      ? getSecondsUntilServerTimestamp(lobby.startsAt, this.serverTimeOffset)
      : undefined;

    let timeDisplay: string;
    let timeDisplayUppercase = false;
    if (timeRemaining === undefined) {
      timeDisplay = renderDuration(this.defaultLobbyTime);
    } else if (timeRemaining > 0) {
      timeDisplay = renderDuration(timeRemaining);
    } else {
      timeDisplay = translateText("public_lobby.starting_game");
      timeDisplayUppercase = true;
    }

    const mapName = getMapName(lobby.gameConfig?.gameMap);

    const modifierLabels = getModifierLabels(
      lobby.gameConfig?.publicGameModifiers,
      lobby.gameConfig?.doomsdayClock?.speed,
    );
    // Sort by length for visual consistency (shorter labels first)
    if (modifierLabels.length > 1) {
      modifierLabels.sort((a, b) => a.length - b.length);
    }

    return html`
      <button
        @click=${() => this.validateAndJoin(lobby)}
        ?disabled=${!this.inputValid}
        class="group relative w-full h-44 sm:h-full text-white uppercase rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-surface hover:shadow-[var(--shadow-lobby-card-hover)] ${!this
          .inputValid
          ? "opacity-50 cursor-not-allowed pointer-events-none"
          : ""}"
      >
        <!-- Image clipped separately so overflow-hidden doesn't block absolute children -->
        <div
          class="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        >
          ${mapImageSrc
            ? html`<img
                src="${mapImageSrc}"
                srcset="${mapImageSrcset}"
                sizes="(min-width: 1024px) 70vw, 100vw"
                alt="${mapName ?? lobby.gameConfig?.gameMap ?? "map"}"
                draggable="false"
                class="absolute inset-0 w-full h-full ${useContain
                  ? "object-contain"
                  : "object-cover object-center"} [image-rendering:auto]"
              />`
            : null}
        </div>
        <!-- Top row: modifiers + timer -->
        <div
          class="absolute inset-x-2 top-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-1.5"
        >
          ${modifierLabels.length > 0
            ? html`<div
                class="flex min-w-0 max-w-full flex-col items-start gap-1 mt-[2px]"
              >
                ${modifierLabels.map(
                  (label) =>
                    html`<span
                      class="max-w-full truncate px-2 py-1 rounded text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest bg-malibu-blue text-white shadow-[var(--shadow-malibu-blue-pill)]"
                      title=${label}
                      >${label}</span
                    >`,
                )}
              </div>`
            : html`<div></div>`}
          <div class="shrink-0">
            <span
              data-lobby-timer
              class="block whitespace-nowrap text-[10px] sm:text-xs font-bold tracking-wider sm:tracking-widest ${timeDisplayUppercase
                ? "uppercase"
                : "normal-case"} bg-malibu-blue text-white px-2 py-1 rounded"
              >${timeDisplay}</span
            >
          </div>
        </div>
        <!-- Bottom bar: map name + mode, with player count floating above -->
        <div
          class="absolute bottom-0 left-0 right-0 flex flex-col px-3 py-2 bg-black/55 backdrop-blur-sm rounded-b-2xl"
          style="overflow: visible;"
        >
          <span
            class="absolute bottom-full right-2 mb-1 flex items-center gap-1 text-xs font-bold tracking-widest bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded"
          >
            ${lobby.numClients}/${lobby.gameConfig?.maxPlayers}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 inline-block"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"
              ></path>
            </svg>
          </span>
          ${mapName
            ? html`<p
                class="text-sm sm:text-base font-bold uppercase tracking-wider text-left leading-tight"
              >
                ${mapName}
              </p>`
            : ""}
          <h3 class="text-xs text-white/70 uppercase tracking-wider text-left">
            ${titleContent}
          </h3>
        </div>
      </button>
    `;
  }

  private async validateAndJoin(lobby: PublicGameInfo) {
    if (!this.validateUsername()) return;
    if (!(await requireLifetimeAccess("multiplayer"))) return;

    this.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          gameID: lobby.gameID,
          source: "public",
          publicLobbyInfo: lobby,
        } as JoinLobbyEvent,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private getLobbyTitle(lobby: PublicGameInfo): string {
    const config = lobby.gameConfig!;
    if (config.gameMode === GameMode.FFA) {
      return translateText("game_mode.ffa");
    }

    if (config?.gameMode === GameMode.Team) {
      const totalPlayers = config.maxPlayers ?? lobby.numClients ?? undefined;
      const formatTeamsOf = (
        teamCount: number | undefined,
        playersPerTeam: number | undefined,
        label?: string,
      ) => {
        if (!teamCount)
          return label ?? translateText("mode_selector.teams_title");
        const baseTitle = playersPerTeam
          ? translateText("mode_selector.teams_of", {
              teamCount: String(teamCount),
              playersPerTeam: String(playersPerTeam),
            })
          : translateText("mode_selector.teams_count", {
              teamCount: String(teamCount),
            });
        return `${baseTitle}${label ? ` (${label})` : ""}`;
      };

      switch (config.playerTeams) {
        case Duos: {
          const teamCount = totalPlayers
            ? Math.floor(totalPlayers / 2)
            : undefined;
          return formatTeamsOf(teamCount, 2);
        }
        case Trios: {
          const teamCount = totalPlayers
            ? Math.floor(totalPlayers / 3)
            : undefined;
          return formatTeamsOf(teamCount, 3);
        }
        case Quads: {
          const teamCount = totalPlayers
            ? Math.floor(totalPlayers / 4)
            : undefined;
          return formatTeamsOf(teamCount, 4);
        }
        case HumansVsNations: {
          const humanSlots = config.maxPlayers ?? lobby.numClients;
          return humanSlots
            ? translateText("public_lobby.teams_hvn_detailed", {
                num: String(humanSlots),
              })
            : translateText("public_lobby.teams_hvn");
        }
        default:
          if (typeof config.playerTeams === "number") {
            const teamCount = config.playerTeams;
            const playersPerTeam =
              totalPlayers && teamCount > 0
                ? Math.floor(totalPlayers / teamCount)
                : undefined;
            return formatTeamsOf(teamCount, playersPerTeam);
          }
      }
    }

    return "";
  }
}
