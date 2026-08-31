import { ClientEnv } from "src/client/ClientEnv";
import { UserMeResponse } from "../core/ApiSchemas";
import { assetUrl } from "../core/AssetUrls";
import { EventBus } from "../core/EventBus";
import {
  GAME_ID_REGEX,
  GameInfo,
  GameRecord,
  GameStartInfo,
  PublicGameInfo,
} from "../core/Schemas";
import { toWireGameStartInfo } from "../core/Util";
import { GameEnv } from "../core/configuration/Config";
import { GameType } from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import "./AccountModal";
import "./AccountSettingsModal";
import { getUserMe, invalidateUserMe, setLastUserMe } from "./Api";
import { appRouter } from "./AppRouter";
import { legacyHashTarget, parseAppUrl } from "./AppRoutes";
import { reauthAfterCrazyGamesChange, userAuth } from "./Auth";
import "./ChangeUsernameModal";
import "./ClanModal";
import { joinLobby, type JoinLobbyResult } from "./ClientGameRunner";
import { getPlayerCosmeticsRefs } from "./Cosmetics";
import { updateCrazyGamesNavButton } from "./CrazyGamesAccountButton";
import { crazyGamesSDK } from "./CrazyGamesSDK";
import "./FeaturedStream";
import "./GameModeSelector";
import { GameModeSelector } from "./GameModeSelector";
import { GameStartingModal } from "./GameStartingModal";
import "./GameStatsModal";
import { HelpModal } from "./HelpModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { showInGameAlert, showInGameConfirm } from "./InGameModal";
import "./InventoryModal";
import { JoinLobbyModal } from "./JoinLobbyModal";
import "./LangSelector";
import { LangSelector } from "./LangSelector";
import { initLayout } from "./Layout";
import "./LeaderboardModal";
import "./Matchmaking";
import { MatchmakingModal } from "./Matchmaking";
import { updateAccountNavButton } from "./NavAccountButton";
import { initNavigation } from "./Navigation";
import "./NewsModal";
import "./OwnerAnalyticsModal";
import "./PlayerProfileModal";
import { RewardsModal } from "./RewardsModal";
import "./SinglePlayerModal";
import { isSteamLinkHash, parseSteamLinkToken } from "./SteamLink";
import "./SteamLinkModal";
import { SteamLinkModal } from "./SteamLinkModal";
import { StoreModal } from "./Store";
import "./SubscriptionModal";
import { TokenLoginModal } from "./TokenLoginModal";
import {
  SendKickPlayerIntentEvent,
  SendToggleGameStartTimer,
  SendUpdateGameConfigIntentEvent,
} from "./Transport";
import { UserSettingModal } from "./UserSettingModal";
import "./UsernameInput";
import { genAnonUsername, UsernameInput } from "./UsernameInput";
import { incrementGamesPlayed, isInIframe, translateText } from "./Utils";
import { isReplayShellHost } from "./VersionedReplay";
import "./components/BannedModal";
import "./components/MarketingConsentToast";
import {
  installDoubleTapZoomBlocker,
  installSafariPinchZoomBlocker,
} from "./utilities/DisableSafariPinchZoom";

import { requireLifetimeAccess } from "./LifetimeAccess";
import "./OpenBackContentModal";
import { socialClient } from "./SocialClient";
import "./components/DesktopNavBar";
import "./components/DetailedGameViewModal";
import "./components/Footer";
import "./components/MainLayout";
import "./components/MobileNavBar";
import "./components/MobileTopBar";
import "./components/PlayPage";
import "./components/PlayerTutorial";
import "./components/RankedModal";
import "./components/SocialInvitePopup";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import { isUpdating, startUpdateWatcher } from "./openback/UpdateWatcher";
import "./styles.css";
import "./styles/core/typography.css";
import "./styles/core/variables.css";
import "./styles/layout/container.css";
import "./styles/layout/header.css";
import "./styles/modal/chat.css";
// Imported after upstream's sheet so OpenBack rules win on the cascade
// without upstream's file needing a single OpenBack line in it.
import "./styles/openback.css";

declare global {
  interface Window {
    turnstile: any;
    gtag?: (...args: any[]) => void;
    currentPageId?: string;
    showPage?: (pageId: string, args?: Record<string, unknown>) => void;
  }

  // Extend the global interfaces to include your custom events
  interface DocumentEventMap {
    "join-lobby": CustomEvent<JoinLobbyEvent>;
    "kick-player": CustomEvent;
    toggle_game_start_timer: CustomEvent;
    "join-changed": CustomEvent;
    "open-matchmaking": CustomEvent<
      | {
          mode?: "1v1" | "2v2" | "3v3" | "4v4";
          teamSize?: 1 | 2 | 3 | 4;
          experienceMode?: "2d" | "3d";
        }
      | undefined
    >;
    "matchmaking-requeue": CustomEvent<{ mode?: "1v1" | "2v2" } | undefined>;
    userMeResponse: CustomEvent<UserMeResponse | false>;
    "session-cleared": CustomEvent;
    "leave-lobby": CustomEvent;
    "game-starting": CustomEvent;
    "update-game-config": CustomEvent;
  }
}

export interface JoinLobbyEvent {
  // Multiplayer games only have gameID, gameConfig is not known until game starts.
  gameID: string;
  // GameConfig only exists when playing a singleplayer game.
  gameStartInfo?: GameStartInfo;
  // GameRecord exists when replaying an archived game.
  gameRecord?: GameRecord;
  source?:
    "public" | "private" | "host" | "invite" | "matchmaking" | "singleplayer";
  publicLobbyInfo?: GameInfo | PublicGameInfo;
  expectedExperienceMode?: "2d" | "3d";
  // Watch without playing.
  spectator?: boolean;
}

class Client {
  private lobbyHandle: JoinLobbyResult | null = null;
  private eventBus: EventBus = new EventBus();

  private currentUrl: string | null = null;

  private usernameInput: UsernameInput | null = null;

  private hostModal: HostPrivateLobbyModal;
  private joinModal: JoinLobbyModal;
  private gameModeSelector: GameModeSelector;
  private userSettings: UserSettings = new UserSettings();
  private storeModal: StoreModal;
  private tokenLoginModal: TokenLoginModal;
  private matchmakingModal: MatchmakingModal;
  private rewardsModal: RewardsModal;
  private steamLinkModal: SteamLinkModal;
  private mostRecentJoinEvent: number;

  private turnstileTokenPromise: Promise<{
    token: string;
    createdAt: number;
  }> | null = null;

  async initialize(): Promise<void> {
    // Already-open tabs cannot see the server-rendered updating page, so
    // they watch the same deploy feed and show it themselves.
    startUpdateWatcher(this.eventBus);
    socialClient.start();
    crazyGamesSDK.maybeInit();

    // Register addressable full pages. Lobby IDs and matchmaking sessions keep
    // their dedicated URL/session handling below; transient overlays are not
    // registered and therefore never write to browser history.
    appRouter.register("store", {
      tag: "store-modal",
      pageId: "page-item-store",
    });
    appRouter.register("settings", {
      tag: "user-setting",
      pageId: "page-settings",
    });
    appRouter.register("leaderboard", {
      tag: "leaderboard-modal",
      pageId: "page-leaderboard",
    });
    appRouter.register("clan", { tag: "clan-modal", pageId: "page-clan" });
    appRouter.register("account", {
      tag: "account-modal",
      pageId: "page-account",
    });
    appRouter.register("analytics", {
      tag: "owner-analytics-modal",
      pageId: "page-analytics",
    });
    appRouter.register("stats", {
      tag: "game-stats-modal",
      pageId: "page-stats",
    });
    appRouter.register("profile", {
      tag: "player-profile-modal",
      pageId: "page-profile",
    });
    appRouter.register("help", { tag: "help-modal", pageId: "page-help" });
    appRouter.register("news", { tag: "news-modal", pageId: "page-news" });
    appRouter.register("tutorials", {
      tag: "openback-content-modal",
      pageId: "page-tutorials",
    });
    appRouter.register("blog", {
      tag: "openback-content-modal",
      pageId: "page-blog",
    });
    appRouter.register("language", {
      tag: "language-modal",
      pageId: "page-language",
    });
    appRouter.register("single-player", {
      tag: "single-player-modal",
      pageId: "page-single-player",
    });
    appRouter.register("ranked", {
      tag: "ranked-modal",
      pageId: "page-ranked",
    });
    appRouter.register("troubleshooting", {
      tag: "troubleshooting-modal",
      pageId: "page-troubleshooting",
    });

    // Prefetch turnstile token so it is available when
    // the user joins a lobby.
    this.turnstileTokenPromise =
      ClientEnv.env() === GameEnv.Dev ||
      ClientEnv.instanceId() === "desktop" ||
      isReplayShellHost(window.location.hostname)
        ? null
        : getTurnstileToken();
    // Prefetch turnstile token so it is available when the user joins a lobby.
    // Desktop (Steam) has no Turnstile script and is server-side exempt, so
    // skip it — otherwise getTurnstileToken() throws "Failed to load Turnstile
    // script" after its load wait. Also skip on the versioned replay shells:
    // the replay host may not be on the Turnstile site key's domain allowlist,
    // so rendering the widget there alerts and rejects — and replays never
    // send a token anyway (see getTurnstileToken below).

    const openBackFont = new FontFace(
      "OpenBack",
      `url(${assetUrl("fonts/overpass-bold.woff")})`,
    );
    document.fonts.add(openBackFont);
    openBackFont.load().catch(() => {});

    // The home controls are rendered by light-DOM Lit components. Wait for
    // those hosts to finish their first render before wiring their children.
    // Without this, fast production builds can query the controls too early
    // and later crash while transitioning from the menu into a loaded match.
    await Promise.all([
      customElements.whenDefined("play-page"),
      customElements.whenDefined("page-footer"),
    ]);
    for (const tagName of ["play-page", "page-footer"]) {
      const host = document.querySelector(tagName) as
        (HTMLElement & { updateComplete?: Promise<unknown> }) | null;
      await host?.updateComplete;
    }

    const langSelector = document.querySelector(
      "lang-selector",
    ) as LangSelector;
    if (!langSelector) {
      console.warn("Lang selector element not found");
    }

    this.usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    if (!this.usernameInput) {
      console.warn("Username input element not found");
    }

    this.gameModeSelector = document.querySelector(
      "game-mode-selector",
    ) as GameModeSelector;

    window.addEventListener("beforeunload", async () => {
      console.log("Browser is closing");
      if (this.lobbyHandle !== null) {
        this.lobbyHandle.stop(true);
        await crazyGamesSDK.gameplayStop();
      }
    });

    document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
    document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
    document.addEventListener("kick-player", this.handleKickPlayer.bind(this));
    document.addEventListener(
      "toggle_game_start_timer",
      this.handleToggleGameStartTimer.bind(this),
    );
    document.addEventListener(
      "update-game-config",
      this.handleUpdateGameConfig.bind(this),
    );
    document.addEventListener(
      "open-matchmaking",
      this.handleOpenMatchmaking.bind(this),
    );
    document.addEventListener(
      "matchmaking-requeue",
      this.handleMatchmakingRequeue.bind(this),
    );

    const hlpModal = document.querySelector("help-modal") as HelpModal;
    if (!hlpModal || !(hlpModal instanceof HelpModal)) {
      console.warn("Help modal element not found");
    }
    const helpButton = document.getElementById("help-button");
    if (helpButton) {
      helpButton.addEventListener("click", () => {
        if (hlpModal && hlpModal instanceof HelpModal) {
          hlpModal.open();
        }
      });
    }

    this.storeModal = document.getElementById("page-item-store") as StoreModal;
    if (!this.storeModal || !(this.storeModal instanceof StoreModal)) {
      console.warn("Store modal element not found");
    }

    // The compact identity-row control is rendered dynamically by PlayPage.
    // Its event bubbles, so one listener keeps it functional across responsive
    // rerenders and takes the player directly to the complete cosmetics store.
    document.addEventListener("cosmetics-input-click", () => {
      void appRouter.navigate({ pageId: "page-item-store", tab: "packs" });
    });

    if (isInIframe()) {
      const mobilePat = document.getElementById("pattern-input-mobile");
      if (mobilePat) mobilePat.style.display = "none";
    }

    if (!this.storeModal || !(this.storeModal instanceof StoreModal)) {
      console.warn("Store modal element not found");
    }

    // We no longer need to manually manage the preview button as PatternInput handles it component-side.
    // However, we still want to ensure the modal can be opened.
    // The setupPatternInput above handles the click event for the new buttons.

    this.storeModal?.refresh();

    window.addEventListener("showPage", (e: any) => {
      if (typeof e?.detail === "string" && e.detail === "page-play") {
        setTimeout(() => {
          this.storeModal?.refresh();
        }, 50);
      }
    });

    this.tokenLoginModal = document.querySelector(
      "token-login",
    ) as TokenLoginModal;
    if (
      !this.tokenLoginModal ||
      !(this.tokenLoginModal instanceof TokenLoginModal)
    ) {
      console.warn("Token login modal element not found");
    }

    this.matchmakingModal = document.querySelector(
      "matchmaking-modal",
    ) as MatchmakingModal;
    if (
      !this.matchmakingModal ||
      !(this.matchmakingModal instanceof MatchmakingModal)
    ) {
      console.warn("Matchmaking modal element not found");
    }

    const onUserMe = async (userMeResponse: UserMeResponse | false) => {
      if (crazyGamesSDK.isOnCrazyGames()) {
        void updateCrazyGamesNavButton();
      } else {
        updateAccountNavButton(userMeResponse);
      }
      setLastUserMe(userMeResponse);
      document.dispatchEvent(
        new CustomEvent("userMeResponse", {
          detail: userMeResponse,
          bubbles: true,
          cancelable: true,
        }),
      );

      if (userMeResponse !== false) {
        // Account identity choices follow the player between browsers. Guests
        // retain their local choices, while linked accounts restore the flag
        // and skin/pattern saved with that email.
        if (userMeResponse.user.email) {
          const settings = new UserSettings();
          if (userMeResponse.user.selectedFlag) {
            settings.setFlag(userMeResponse.user.selectedFlag);
          } else {
            settings.clearFlag();
          }
          settings.setSelectedPatternName(userMeResponse.user.selectedCosmetic);
        }
        // Authorized
        console.log(
          `Your player ID is ${userMeResponse.player.publicId}\n` +
            "Sharing this ID will allow others to view your game history and stats.",
        );
      }
    };

    if ((await userAuth()) === false) {
      // Not logged in. (OpenBack has self-contained same-origin auth that works
      // in every environment, so we must not short-circuit on GameEnv.Dev the
      // way upstream does — otherwise a signed-in player always shows as logged
      // out: no username, empty currency, "not logged in" store/leaderboard.)
      onUserMe(false);
    } else {
      // JWT appears to be valid
      // TODO: Add caching
      getUserMe().then(onUserMe);
    }

    // Re-run auth when the player signs into CrazyGames mid-session. Logout
    // reloads the page, so only login needs handling here.
    crazyGamesSDK.addAuthListener(() => {
      invalidateUserMe();
      reauthAfterCrazyGamesChange().then((result) =>
        result === false ? onUserMe(false) : getUserMe().then(onUserMe),
      );
    });

    // The account modal (and other flows) can log the user in mid-session and
    // broadcast `userMeResponse`. Keep the top-bar account button in sync with
    // those events so a fresh login shows the username without a page reload.
    document.addEventListener("userMeResponse", (event: Event) => {
      if (crazyGamesSDK.isOnCrazyGames()) {
        void updateCrazyGamesNavButton();
        return;
      }
      const detail = (event as CustomEvent<UserMeResponse | false>).detail;
      updateAccountNavButton(detail);
    });

    const settingsModal = document.querySelector(
      "user-setting",
    ) as UserSettingModal;
    if (!settingsModal || !(settingsModal instanceof UserSettingModal)) {
      console.warn("User settings modal element not found");
    }
    document
      .getElementById("settings-button")
      ?.addEventListener("click", () => {
        if (settingsModal && settingsModal instanceof UserSettingModal) {
          settingsModal.open();
        }
      });

    this.hostModal = document.querySelector(
      "host-lobby-modal",
    ) as HostPrivateLobbyModal;
    if (!this.hostModal || !(this.hostModal instanceof HostPrivateLobbyModal)) {
      console.warn("Host private lobby modal element not found");
    } else {
      this.hostModal.eventBus = this.eventBus;
    }

    this.joinModal = document.querySelector(
      "join-lobby-modal",
    ) as JoinLobbyModal;
    if (!this.joinModal || !(this.joinModal instanceof JoinLobbyModal)) {
      console.warn("Join lobby modal element not found");
    } else {
      this.joinModal.eventBus = this.eventBus;
    }

    appRouter.setNavigationGuard(async () => {
      if (this.currentUrl === null || this.lobbyHandle === null) return true;

      if (!this.lobbyHandle.stop()) {
        const confirmed = await showInGameConfirm(
          translateText("help_modal.exit_confirmation"),
        );
        if (!confirmed) return false;
      }

      await this.handleLeaveLobby();
      return true;
    });

    // Install clean-path Back/Forward handling even when a lobby, replay, or
    // callback route below owns the initial screen.
    await appRouter.start();

    // Attempt to join lobby
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.handleUrl());
    } else {
      this.handleUrl();
    }

    const onHashUpdate = () => {
      // Legacy page hashes migrate to clean paths without tearing down lobby
      // state. Authentication and callback hashes continue below.
      const legacyTarget = legacyHashTarget(new URL(window.location.href));
      if (legacyTarget) {
        void appRouter.navigate(legacyTarget, { replace: true });
        return;
      }

      // Reset the UI to its initial state
      this.joinModal?.close();

      onJoinChanged();
    };

    const onJoinChanged = () => {
      if (this.lobbyHandle !== null) {
        this.handleLeaveLobby();
      }

      // Attempt to join lobby
      this.handleUrl();
    };

    // Handle browser navigation & manual hash edits
    window.addEventListener("hashchange", onHashUpdate);
    window.addEventListener("join-changed", onJoinChanged);

    function updateSliderProgress(slider: HTMLInputElement) {
      const percent =
        ((Number(slider.value) - Number(slider.min)) /
          (Number(slider.max) - Number(slider.min))) *
        100;
      slider.style.setProperty("--progress", `${percent}%`);
    }

    document
      .querySelectorAll<HTMLInputElement>(
        "#bots-count, #private-lobby-bots-count",
      )
      .forEach((slider) => {
        updateSliderProgress(slider);
        slider.addEventListener("input", () => updateSliderProgress(slider));
      });
  }

  private async handleUrl() {
    // Wait for modal custom elements to be defined
    await Promise.all([
      customElements.whenDefined("join-lobby-modal"),
      customElements.whenDefined("host-lobby-modal"),
    ]);

    // Check if CrazyGames SDK is enabled first (no hash needed in CrazyGames)
    if (crazyGamesSDK.isOnCrazyGames()) {
      const lobbyId = await crazyGamesSDK.getInviteGameId();
      console.log("got game id", lobbyId);
      if (lobbyId && GAME_ID_REGEX.test(lobbyId)) {
        console.log("game parsed successfully");
        // Wait 2 seconds to ensure all elements are actually loaded,
        // On low end-chromebooks the join modal was not registered in time.
        await new Promise((resolve) => setTimeout(resolve, 2000));
        window.showPage?.("page-join-lobby");
        this.joinModal?.open({ lobbyId });
        console.log(`CrazyGames: joining lobby ${lobbyId} from invite param`);
        return;
      }
    }
    crazyGamesSDK.isInstantMultiplayer().then((isInstant) => {
      if (isInstant) {
        console.log(
          `CrazyGames: joining instant multiplayer lobby from CrazyGames`,
        );
        this.hostModal.open();
      }
    });

    const strip = () =>
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

    const alertAndStrip = async (message: string) => {
      await showInGameAlert(message);
      strip();
    };

    const hash = window.location.hash;

    // Decode the hash first to handle encoded characters
    const decodedHash = decodeURIComponent(hash);
    const params = new URLSearchParams(decodedHash.split("?")[1] || "");

    // Handle different hash sections
    if (decodedHash.startsWith("#purchase-completed")) {
      // Parse params after the ?
      const status = params.get("status");

      if (status !== "true") {
        await alertAndStrip("Purchase failed.");
        return;
      }

      const type = params.get("type");
      if (type === "currency_pack") {
        await alertAndStrip(
          translateText("store.currency_pack_purchase_success"),
        );
        return;
      }

      if (type === "subscription_tier") {
        await showInGameAlert(
          translateText("store.subscription_purchase_success"),
        );
        strip();
        invalidateUserMe();
        window.location.reload();
        return;
      }

      const cosmeticName = params.get("cosmetic");
      if (!cosmeticName) {
        await showInGameAlert("Something went wrong. Please contact support.");
        console.error("purchase-completed but no pattern name");
        return;
      }

      const setCosmetic = () => {
        if (cosmeticName.startsWith("pattern:")) {
          this.userSettings.setSelectedPatternName(cosmeticName);
        } else if (cosmeticName.startsWith("flag:")) {
          this.userSettings.setFlag(cosmeticName);
        }
      };
      const token = params.get("login-token");

      if (token) {
        strip();
        window.addEventListener("beforeunload", () => {
          // The page reloads after token login, so we need to save the pattern name
          // in case it is unset during reload.
          setCosmetic();
        });
        this.tokenLoginModal.openWithToken(token);
      } else {
        await alertAndStrip(`Purchase succeeded: ${cosmeticName}`);
        setCosmetic();
        this.storeModal.refresh();
      }
      return;
    }

    if (decodedHash.startsWith("#token-login")) {
      const token = params.get("token-login");

      if (!token) {
        alertAndStrip(
          `login failed! Please try again later or contact support.`,
        );
        return;
      }

      strip();
      this.tokenLoginModal.openWithToken(token);
      return;
    }

    // The desktop Electron shell's account-linking gate opens the browser
    // here (see SteamLink.ts for the full handoff). Checked against the raw
    // hash, not decodedHash — parseSteamLinkToken's prefix match is exact
    // and the token itself is opaque, so no decoding is needed or expected.
    const steamLinkToken = parseSteamLinkToken(hash);
    if (steamLinkToken) {
      strip();
      void this.steamLinkModal?.openWithToken(steamLinkToken);
      return;
    }

    // Fallback: the gate's browser handoff itself can fail (wrong default
    // browser, an odd Linux setup, Steam's overlay browser), in which case it
    // shows an 8-character code instead and tells the player to enter it on
    // the website. There's no token in that case, so parseSteamLinkToken
    // above returns null — this is the bare `#steam-link` hash the code path
    // lands on instead (see SteamLink.ts's isSteamLinkHash).
    if (isSteamLinkHash(hash)) {
      strip();
      void this.steamLinkModal?.openForCodeEntry();
      return;
    }

    // On a versioned replay shell the pathname IS the game id: the worker
    // serves the record's matching build at replay.<domain>/<gameId> (see
    // VersionedReplay.ts).
    if (isReplayShellHost(window.location.hostname)) {
      const replayGameId = window.location.pathname.slice(1);
      if (GAME_ID_REGEX.test(replayGameId)) {
        window.showPage?.("page-join-lobby");
        this.joinModal.open({ lobbyId: replayGameId });
        console.log(`joining replay ${replayGameId}`);
        return;
      }
    }

    const pathMatch = window.location.pathname.match(
      /^\/(?:w\d+\/)?game\/([^/]+)/,
    );
    const lobbyId =
      pathMatch && GAME_ID_REGEX.test(pathMatch[1]) ? pathMatch[1] : null;
    if (lobbyId) {
      // ?host means the lobby creator is returning to a successor lobby they
      // reused from the win screen: reopen the host view bound to the existing
      // lobby instead of the join flow. Non-creators who hit this URL still get
      // treated as normal joiners by the server.
      const returningAsHost = new URLSearchParams(window.location.search).has(
        "host",
      );
      if (returningAsHost) {
        // open() reveals the inline page itself (it calls showPage internally).
        // Calling showPage first would open the modal once with no args and
        // spuriously create a lobby before this attach call runs.
        this.hostModal.open({ existingLobbyId: lobbyId });
        console.log(`reopening host lobby ${lobbyId}`);
        return;
      }
      // ?spectate is the watch-only form of the same lobby link, so a cast or
      // an archive can hand out a URL that never takes a player slot.
      const spectate = new URLSearchParams(window.location.search).has(
        "spectate",
      );
      window.showPage?.("page-join-lobby");
      this.joinModal.open({ lobbyId, spectate });
      console.log(`${spectate ? "spectating" : "joining"} lobby ${lobbyId}`);
      return;
    }
    if (parseAppUrl(new URL(window.location.href)).kind !== "reserved") {
      return;
    }
    if (decodedHash.startsWith("#affiliate=")) {
      const affiliateCode = decodedHash.replace("#affiliate=", "");
      strip();
      if (affiliateCode) {
        this.storeModal?.open({ affiliateCode });
      }
    }
    if (decodedHash.startsWith("#refresh")) {
      window.location.href = "/";
    }

    const requeueMode = this.consumeRequeueUrl();
    if (requeueMode !== null) {
      document.dispatchEvent(
        new CustomEvent("open-matchmaking", {
          detail: { mode: requeueMode },
        }),
      );
    }
  }

  // Returns the requeue mode ("/?requeue" = 1v1, "/?requeue=2v2" = 2v2), or
  // null when the URL has no requeue param.
  private consumeRequeueUrl(): "1v1" | "2v2" | null {
    const searchParams = new URLSearchParams(window.location.search);
    if (!searchParams.has("requeue")) {
      return null;
    }
    const mode = searchParams.get("requeue") === "2v2" ? "2v2" : "1v1";

    searchParams.delete("requeue");
    const newUrl =
      window.location.pathname +
      (searchParams.toString() ? `?${searchParams.toString()}` : "") +
      window.location.hash;
    history.replaceState(null, "", newUrl);
    return mode;
  }

  private async handleJoinLobby(event: CustomEvent<JoinLobbyEvent>) {
    const lobby = event.detail;
    // Refuse to start anything while the server is being replaced. Every start
    // route - solo, multiplayer, invites and matchmaking - passes through here,
    // so this is the one place that can cancel them all. Starting mid-window
    // would drop the player into a game the server is about to restart under.
    if (isUpdating()) {
      console.info("Update in progress, cancelling game start");
      return;
    }
    this.mostRecentJoinEvent = event.timeStamp;
    if (this.usernameInput && !this.usernameInput.canPlay()) {
      return;
    }
    // Direct invite URLs, social invitations, and other internal join events
    // must pass the same gate as the visible multiplayer buttons. Locally
    // created Solo games and replay viewing remain free.
    if (
      !lobby.gameStartInfo &&
      !lobby.gameRecord &&
      !(await requireLifetimeAccess(
        lobby.source === "matchmaking" ? "ranked" : "multiplayer",
      ))
    ) {
      return;
    }

    console.log(`joining lobby ${lobby.gameID}`);
    if (this.lobbyHandle !== null) {
      console.log("joining lobby, stopping existing game");
      this.lobbyHandle.stop(true);
      document.body.classList.remove("in-game");
    }
    if (lobby.source === "public") {
      this.joinModal?.open({
        lobbyId: lobby.gameID,
        lobbyInfo: lobby.publicLobbyInfo,
      });
    }
    if (lobby.source === "invite") {
      this.joinModal?.open({
        lobbyId: lobby.gameID,
        alreadyJoining: true,
      });
    }
    // Only update URL immediately for private lobbies, not public ones
    if (lobby.source !== "public") {
      this.updateJoinUrlForShare(lobby.gameID);
    }
    const auth = await userAuth();
    const playerRole = auth !== false ? (auth.claims.role ?? null) : null;
    // Ensure the one-shot Steam name-seed has settled before reading
    // getUsername(), mirroring how getClanCheck() runs in parallel with the
    // handshake. whenSeeded() always resolves (falling back to the generated
    // anon name on failure/timeout), so this can only delay, never block.
    await this.usernameInput?.whenSeeded();
    const newLobbyHandle = joinLobby(this.eventBus, {
      gameID: lobby.gameID,
      cosmetics: await getPlayerCosmeticsRefs(),
      turnstileToken: await this.getTurnstileToken(lobby),
      playerName: this.usernameInput?.getUsername() ?? genAnonUsername(),
      playerClanTag: this.usernameInput?.getClanTag() ?? null,
      clanTagCheck: this.usernameInput?.getClanCheck(),
      playerRole,
      gameStartInfo:
        lobby.gameStartInfo ??
        // Replays simulate from the archived record; re-apply the server's
        // wire blanking or team games desync (see toWireGameStartInfo).
        (lobby.gameRecord
          ? toWireGameStartInfo(lobby.gameRecord.info)
          : undefined),
      gameRecord: lobby.gameRecord,
      expectedExperienceMode:
        lobby.expectedExperienceMode ??
        lobby.publicLobbyInfo?.experienceMode ??
        lobby.gameStartInfo?.config.experienceMode ??
        lobby.gameRecord?.info.config.experienceMode,
      spectator: lobby.spectator,
    });

    if (this.mostRecentJoinEvent !== event.timeStamp) {
      newLobbyHandle.stop(true);
      console.warn("Join requested, but was superseded");
      return;
    }

    this.lobbyHandle = newLobbyHandle;

    this.lobbyHandle.prestart.then(() => {
      // The game is actually starting now (lobby wait is over). Let listeners that stay up
      // through the wait (e.g. the featured-stream panel) hide at this point instead of on join.
      document.dispatchEvent(new CustomEvent("game-starting"));
      console.log("Closing modals");
      document.getElementById("settings-button")?.classList.add("hidden");
      if (this.usernameInput) {
        // fix edge case where username-validation-error is re-rendered and hidden tag removed
        this.usernameInput.validationError = "";
      }
      document
        .getElementById("username-validation-error")
        ?.classList.add("hidden");
      // Disarm BOTH lobby modals before closing either: closing any
      // page-modal navigates via showPage, which force-closes the currently
      // visible page — the other lobby modal. If that one is still armed,
      // its onClose leaves the lobby and disconnects the player mid
      // game-start (host or joiner, depending on close order).
      this.hostModal?.disarmLeaveOnClose();
      this.joinModal?.disarmLeaveOnClose();
      this.hostModal?.closeWithoutLeaving();
      this.joinModal?.closeWithoutLeaving();
      [
        "single-player-modal",
        "game-starting-modal",
        "game-top-bar",
        "help-modal",
        "user-setting",
        "troubleshooting-modal",
        "inventory-modal",
        "store-modal",
        "language-modal",
        "news-modal",
        "account-button",
        "leaderboard-button",
        "token-login",
        "steam-link-modal",
        "matchmaking-modal",
        "clan-modal",
        "account-settings-modal",
        "change-username-modal",
        "subscription-modal",
        "lang-selector",
      ].forEach((tag) => {
        const modal = document.querySelector(tag) as HTMLElement & {
          close?: () => void;
          isModalOpen?: boolean;
        };
        if (modal?.close) {
          modal.close();
        } else if (modal && "isModalOpen" in modal) {
          modal.isModalOpen = false;
        }
      });
      this.gameModeSelector.stop();

      crazyGamesSDK.loadingStart();

      // show when the game loads
      const startingModal = document.querySelector(
        "game-starting-modal",
      ) as GameStartingModal;
      if (startingModal && startingModal instanceof GameStartingModal) {
        startingModal.show();
      }
    });

    this.lobbyHandle.join.then(() => {
      this.joinModal?.closeWithoutLeaving();
      this.gameModeSelector.stop();
      incrementGamesPlayed();

      crazyGamesSDK.loadingStop();
      crazyGamesSDK.gameplayStart();
      document.body.classList.add("in-game");

      const lobbyIdHidden = !this.userSettings.lobbyIdVisibility();
      if (isReplayShellHost(window.location.hostname)) {
        // Keep the canonical replay URL (replay.<domain>/<gameId>): the
        // /game/<id> shape and the #refresh trampoline only exist on the
        // game-server origin, so rewriting here would leave a URL that 404s
        // when reloaded or shared (see VersionedReplay.ts).
        history.pushState(null, "", window.location.pathname);
      } else {
        // Ensure there's a homepage entry in history before adding the lobby entry
        if (window.location.hash === "" || window.location.hash === "#") {
          history.replaceState(null, "", window.location.origin + "#refresh");
        }
        history.pushState(
          null,
          "",
          lobbyIdHidden
            ? "/streamer-mode"
            : `/${ClientEnv.workerPath(lobby.gameID)}/game/${lobby.gameID}?live`,
        );
      }

      // Store current URL for popstate confirmation
      this.currentUrl = window.location.href;
      appRouter.acceptCurrentLocation();
    });
  }

  private updateJoinUrlForShare(lobbyId: string) {
    const lobbyIdHidden = !this.userSettings.lobbyIdVisibility();
    let targetUrl: string;
    if (isReplayShellHost(window.location.hostname)) {
      // Keep the canonical replay URL (replay.<domain>/<gameId>): the
      // /game/<id> shape only exists on the game-server origin, so rewriting
      // here would leave a URL that 404s when reloaded or shared (see
      // VersionedReplay.ts).
      targetUrl = window.location.pathname;
    } else if (lobbyIdHidden) {
      targetUrl = "/streamer-mode";
    } else {
      targetUrl = `/${ClientEnv.workerPath(lobbyId)}/game/${lobbyId}`;
    }
    const currentUrl = window.location.pathname;

    if (currentUrl !== targetUrl) {
      history.replaceState(null, "", targetUrl);
    }
    appRouter.acceptCurrentLocation();
  }

  private async handleLeaveLobby(event?: CustomEvent) {
    if (this.lobbyHandle !== null) {
      console.log("leaving lobby, cancelling game");
      this.lobbyHandle.stop(true);
      this.lobbyHandle = null;
    }
    this.currentUrl = null;

    try {
      history.replaceState(null, "", "/");
      appRouter.acceptCurrentLocation();
    } catch (e) {
      console.warn("Failed to restore URL on leave:", e);
    }

    document.body.classList.remove("in-game");

    if (this.joinModal.isOpen()) {
      this.joinModal.close();
      if (event?.detail.cause === "full-lobby") {
        window.dispatchEvent(
          new CustomEvent("show-message", {
            detail: {
              message: translateText("public_lobby.join_timeout"),
              color: "red",
              duration: 3500,
            },
          }),
        );
      }
    }

    crazyGamesSDK.gameplayStop();
  }

  // Puts the player back into the ranked queue. From a pre-start match
  // cancellation the matchmaking modal is still open and rejoins in place,
  // keeping its mode. From a finished game (WinModal passes the mode) the
  // page needs the reload teardown, so navigate home with the requeue
  // param and let consumeRequeueUrl() reopen the queue. A modeless
  // dispatch with no open modal (the player closed it mid-wait) stays a
  // no-op — don't force them back into a queue they left.
  private handleMatchmakingRequeue(
    event: CustomEvent<
      | {
          mode?: "1v1" | "2v2" | "3v3" | "4v4";
          experienceMode?: "2d" | "3d";
        }
      | undefined
    >,
  ) {
    if (this.matchmakingModal?.requeue()) {
      return;
    }
    if (event.detail?.mode !== undefined) {
      window.location.href =
        event.detail.mode === "2v2" ? "/?requeue=2v2" : "/?requeue";
    }
  }

  private handleOpenMatchmaking(
    event: CustomEvent<
      | {
          mode?: "1v1" | "2v2" | "3v3" | "4v4";
          teamSize?: 1 | 2 | 3 | 4;
          experienceMode?: "2d" | "3d";
        }
      | undefined
    >,
  ) {
    if (!this.matchmakingModal) return;
    // Always set the mode: dispatchers without a detail (homepage button,
    // requeue URL) mean 1v1 and must reset a lingering 2v2 selection.
    const teamSize = event.detail?.teamSize ?? 1;
    this.matchmakingModal.mode =
      event.detail?.mode ??
      (`${teamSize}v${teamSize}` as typeof this.matchmakingModal.mode);
    this.matchmakingModal.experienceMode =
      event.detail?.experienceMode === "3d" ? "3d" : "2d";
    this.matchmakingModal.open();
  }

  private handleKickPlayer(event: CustomEvent) {
    const { target } = event.detail;

    // Forward to eventBus if available
    if (this.eventBus) {
      this.eventBus.emit(new SendKickPlayerIntentEvent(target));
    }
  }

  private handleToggleGameStartTimer() {
    if (this.eventBus) {
      this.eventBus.emit(new SendToggleGameStartTimer());
    }
  }

  private handleUpdateGameConfig(event: CustomEvent) {
    const { config } = event.detail;

    // Forward to eventBus if available
    if (this.eventBus) {
      this.eventBus.emit(new SendUpdateGameConfigIntentEvent(config));
    }
  }

  private async getTurnstileToken(
    lobby: JoinLobbyEvent,
  ): Promise<string | null> {
    if (
      ClientEnv.env() === GameEnv.Dev ||
      ClientEnv.instanceId() === "desktop" ||
      lobby.gameStartInfo?.config.gameType === GameType.Singleplayer ||
      // Replays simulate locally from the archived record; there is no
      // server to verify a token (and on the CDN replay shells Turnstile
      // cannot load at all).
      lobby.gameRecord !== undefined
    ) {
      return null;
    }

    // Always request a new token on crazygames.
    if (this.turnstileTokenPromise === null || crazyGamesSDK.isOnCrazyGames()) {
      console.log("No prefetched turnstile token, getting new token");
      return (await getTurnstileToken())?.token ?? null;
    }

    const token = await this.turnstileTokenPromise;
    // Clear promise so a new token is fetched next time
    this.turnstileTokenPromise = null;
    if (!token) {
      console.log("No turnstile token");
      return null;
    }

    const tokenTTL = 3 * 60 * 1000;
    if (Date.now() < token.createdAt + tokenTTL) {
      console.log("Prefetched turnstile token is valid");

      return token.token;
    } else {
      console.log("Turnstile token expired, getting new token");
      return (await getTurnstileToken())?.token ?? null;
    }
  }
}

// Hide elements with no-crazygames class if on CrazyGames
const hideCrazyGamesElements = () => {
  if (crazyGamesSDK.isOnCrazyGames()) {
    document.querySelectorAll(".no-crazygames").forEach((el) => {
      (el as HTMLElement).style.display = "none";
    });
  }
};

// Initialize the client when the DOM is loaded
const bootstrap = () => {
  // Prevent Safari's page-level pinch-zoom, which ignores `user-scalable=no`
  // on iOS and can softlock the HUD. See issue #2330.
  installSafariPinchZoomBlocker();
  // Same for double-tap "smart zoom", which `touch-action: manipulation`
  // alone does not reliably stop on iOS.
  installDoubleTapZoomBlocker();

  initLayout();
  new Client().initialize();
  initNavigation();

  // Hide elements immediately
  hideCrazyGamesElements();

  // Also hide elements after a short delay to catch late-rendered components
  setTimeout(hideCrazyGamesElements, 100);
  setTimeout(hideCrazyGamesElements, 500);

  // Populate the CrazyGames account buttons once the nav/top-bar have rendered
  // (onUserMe also refreshes them after auth and on mid-session sign-in).
  setTimeout(() => void updateCrazyGamesNavButton(), 500);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}

let turnstileInFlight: Promise<{ token: string; createdAt: number }> | null =
  null;

async function getTurnstileToken(): Promise<{
  token: string;
  createdAt: number;
}> {
  turnstileInFlight ??= createTurnstileToken();
  try {
    return await turnstileInFlight;
  } finally {
    turnstileInFlight = null;
  }
}

async function createTurnstileToken(): Promise<{
  token: string;
  createdAt: number;
}> {
  if (
    typeof window.turnstile === "undefined" &&
    !document.querySelector("script[data-openback-turnstile]")
  ) {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.dataset.openbackTurnstile = "true";
    document.head.appendChild(script);
  }

  // Wait for Turnstile script to load (handles slow connections)
  let attempts = 0;
  while (typeof window.turnstile === "undefined" && attempts < 100) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    attempts++;
  }

  if (typeof window.turnstile === "undefined") {
    throw new Error("Failed to load Turnstile script");
  }

  const widgetId = window.turnstile.render("#turnstile-container", {
    sitekey: ClientEnv.turnstileSiteKey(),
    size: "normal",
    appearance: "interaction-only",
    theme: "light",
  });

  return new Promise((resolve, reject) => {
    window.turnstile.execute(widgetId, {
      callback: (token: string) => {
        window.turnstile.remove(widgetId);
        console.log("Turnstile verification completed");
        resolve({ token, createdAt: Date.now() });
      },
      "error-callback": (errorCode: string) => {
        window.turnstile.remove(widgetId);
        console.error(`Turnstile error: ${errorCode}`);
        void showInGameAlert(
          `Turnstile error: ${errorCode}. Please refresh and try again.`,
        );
        reject(new Error(`Turnstile failed: ${errorCode}`));
      },
    });
  });
}
