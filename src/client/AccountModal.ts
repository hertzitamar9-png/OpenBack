import { html, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { ClientEnv } from "src/client/ClientEnv";
import { PlayerStatsTree, UserMeResponse } from "../core/ApiSchemas";
import { Cosmetics } from "../core/CosmeticSchemas";
import {
  fetchPlayerById,
  getUserMe,
  invalidateUserMe,
  setLastUserMe,
  updateMyProfile,
} from "./Api";
import {
  deleteAccount,
  EmailAuthMode,
  googleLogin,
  logOut,
  reauthAfterCrazyGamesChange,
  requestLoginCode,
  verifyLoginCode,
} from "./Auth";
import "./components/baseComponents/stats/PlayerGameHistoryView";
import type { PlayerGameHistoryCache } from "./components/baseComponents/stats/PlayerGameHistoryView";
import "./components/baseComponents/stats/PlayerStatsTable";
import "./components/baseComponents/stats/PlayerStatsTree";
import { BaseModal } from "./components/BaseModal";
import "./components/CopyButton";
import "./components/CurrencyDisplay";
import "./components/Difficulties";
import "./components/FriendsList";
import "./components/SubscriptionPanel";
import { modalHeader } from "./components/ui/ModalHeader";
import { fetchCosmetics, SUBSCRIPTIONS_ENABLED } from "./Cosmetics";
import { crazyGamesSDK, type CrazyGamesUser } from "./CrazyGamesSDK";
import { translateText } from "./Utils";

@customElement("account-modal")
export class AccountModal extends BaseModal {
  protected routerName = "account";

  @state() private email: string = "";
  @state() private code: string = "";
  @state() private codeSent: boolean = false;
  @state() private authMessage: string = "";
  @state() private authMessageType: "success" | "error" | "info" = "info";
  @state() private isAuthBusy: boolean = false;
  @state() private isLoadingUser: boolean = false;
  @state() private profileDisplayName = "";
  @state() private profileBio = "";
  @state() private profileBannerColor = "#1689d8";
  @state() private profileSaving = false;
  @state() private profileMessage = "";
  @state() private profileMessageError = false;
  @state() private authMode: EmailAuthMode | null = null;
  @state() private authSuggestedAction: EmailAuthMode | null = null;
  @state() private dangerAction:
    | null
    | "logout"
    | "delete-first"
    | "delete-final" = null;
  @state() private accountActionBusy = false;
  @state() private accountActionError = "";
  // Set on CrazyGames when a CrazyGames user is signed in. Their identity comes
  // from the SDK, not our backend user object.
  @state() private crazyGamesUser: CrazyGamesUser | null = null;

  private userMeResponse: UserMeResponse | null = null;
  private cosmetics: Cosmetics | null = null;
  private statsTree: PlayerStatsTree | null = null;
  // Preserves the Games tab's accumulated list + cursor across tab switches.
  private gameHistoryCache: PlayerGameHistoryCache | null = null;

  constructor() {
    super();

    document.addEventListener("userMeResponse", (event: Event) => {
      // A CrazyGames sign-in fires userMeResponse (via Main's auth listener);
      // re-fetch the SDK profile so the modal leaves the sign-in screen.
      this.refreshCrazyGamesUser();
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        const previousPublicId = this.userMeResponse?.player?.publicId;
        this.userMeResponse = customEvent.detail as UserMeResponse;
        this.syncProfileFields(this.userMeResponse);
        // Reset whenever the player identity changes (login, or switching to a
        // different account) so stats/history from the previous player don't
        // linger.
        if (this.userMeResponse?.player?.publicId !== previousPublicId) {
          this.statsTree = null;
          this.gameHistoryCache = null;
          this.requestUpdate();
        }
      } else {
        this.statsTree = null;
        this.gameHistoryCache = null;
        this.requestUpdate();
      }
    });
  }

  // Refresh the signed-in CrazyGames identity from the SDK. No-op off
  // CrazyGames; drives isLinkedAccount() so the modal shows the profile.
  private refreshCrazyGamesUser() {
    if (!crazyGamesSDK.isOnCrazyGames()) return;
    void crazyGamesSDK.getUserProfile().then((user) => {
      this.crazyGamesUser = user;
      this.requestUpdate();
    });
  }

  private hasAnyStats(): boolean {
    if (!this.statsTree) return false;
    // Check if statsTree has any data
    return (
      Object.keys(this.statsTree).length > 0 &&
      Object.values(this.statsTree).some(
        (gameTypeStats) =>
          gameTypeStats && Object.keys(gameTypeStats).length > 0,
      )
    );
  }

  protected renderHeaderSlot() {
    return modalHeader({
      title: translateText("account_modal.title"),
      onBack: () => this.close(),
      ariaLabel: translateText("common.back"),
    });
  }

  private isLinkedAccount(): boolean {
    const me = this.userMeResponse?.user;
    // The CrazyGames identity only counts once the backend token exchange
    // produced a session — otherwise a failed exchange would show a dead
    // "connected as" view with no way to retry.
    return (
      !!(me?.discord ?? me?.email) ||
      (!!this.crazyGamesUser && this.userMeResponse !== null)
    );
  }

  protected modalConfig() {
    if (this.isLoadingUser || !this.isLinkedAccount() || this.dangerAction) {
      return {};
    }
    return {
      tabs: [
        { key: "account", label: translateText("account_modal.tab_account") },
        { key: "stats", label: translateText("account_modal.tab_stats") },
        { key: "games", label: translateText("account_modal.tab_games") },
        { key: "friends", label: translateText("account_modal.tab_friends") },
      ],
    };
  }

  protected renderBody(tab: string) {
    if (this.isLoadingUser) {
      return this.renderLoadingSpinner(
        translateText("account_modal.fetching_account"),
      );
    }
    if (!this.isLinkedAccount()) {
      return html`<div class="custom-scrollbar mr-1">
        ${crazyGamesSDK.isOnCrazyGames()
          ? this.renderCrazyGamesSignIn()
          : this.renderLoginOptions()}
      </div>`;
    }
    if (this.dangerAction) return this.renderDangerConfirmation();
    return html`
      <div class="custom-scrollbar mr-1">
        <div class="p-6">${this.renderTab(tab)}</div>
      </div>
    `;
  }

  private renderTab(tab: string): TemplateResult {
    switch (tab) {
      case "stats":
        return this.renderStatsTab();
      case "games":
        return this.renderGamesTab();
      case "friends":
        return this.renderFriendsTab();
      default:
        return this.renderAccountTab();
    }
  }

  private renderFriendsTab(): TemplateResult {
    const myPublicId = this.userMeResponse?.player?.publicId ?? "";
    const clanTag = this.userMeResponse?.player?.clans?.[0]?.tag ?? "";
    return html`
      <div class="flex flex-col gap-4">
        ${this.renderPublicPlayerId()}
        <friends-list
          .myPublicId=${myPublicId}
          .clanTag=${clanTag}
        ></friends-list>
      </div>
    `;
  }

  private renderPublicPlayerId(): TemplateResult {
    const publicId = this.userMeResponse?.player?.publicId ?? "";
    if (!publicId) return html``;
    return html`
      <div
        class="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-4"
      >
        <span class="text-xs font-bold uppercase tracking-wider text-blue-400">
          ${translateText("account_modal.public_player_id")}
        </span>
        <copy-button
          .lobbyId=${publicId}
          .copyText=${publicId}
          .displayText=${publicId}
        ></copy-button>
      </div>
    `;
  }

  private renderAccountTab(): TemplateResult {
    if (this.crazyGamesUser) {
      return this.renderCrazyGamesAccount(this.crazyGamesUser);
    }
    return html`
      <div class="flex flex-col gap-6">
        <div
          class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-5 py-4"
        >
          <div class="min-w-0">
            <div
              class="text-xs font-bold uppercase tracking-wider text-white/40"
            >
              ${translateText("account_modal.connected_as")}
            </div>
            <div class="mt-1 truncate text-sm font-semibold text-white/80">
              ${this.userMeResponse?.user?.email ?? ""}
            </div>
          </div>
          ${this.renderCurrency()}
        </div>
        <div
          class="overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          <div
            class="min-h-36 bg-gradient-to-br from-black/10 to-black/55 p-6"
            style=${`background-color:${this.profileBannerColor}`}
          >
            <div class="flex min-h-24 items-end justify-between gap-4">
              <div class="min-w-0">
                <div
                  class="truncate text-2xl font-black text-white drop-shadow"
                >
                  ${this.profileDisplayName ||
                  translateText("account_modal.profile_name_preview")}
                </div>
                <p class="mt-1 max-w-xl text-sm text-white/80">
                  ${this.profileBio ||
                  translateText("account_modal.profile_bio_preview")}
                </p>
              </div>
              <div class="shrink-0 text-right text-xs font-bold text-white/80">
                ${this.userMeResponse?.user.selectedFlag
                  ? translateText("account_modal.profile_flag_preview", {
                      flag: this.userMeResponse.user.selectedFlag,
                    })
                  : ""}
                ${this.userMeResponse?.user.selectedCosmetic
                  ? html`<div>
                      ${translateText(
                        "account_modal.profile_cosmetic_preview",
                        {
                          cosmetic: this.userMeResponse.user.selectedCosmetic,
                        },
                      )}
                    </div>`
                  : ""}
              </div>
            </div>
          </div>
          <div class="space-y-4 p-6">
            <div>
              <h3 class="text-lg font-bold text-white">
                ${translateText("account_modal.profile_customization")}
              </h3>
              <p class="text-xs text-white/40">
                ${translateText("account_modal.profile_customization_desc")}
              </p>
            </div>
            <label class="block">
              <span
                class="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50"
              >
                ${translateText("account_modal.display_name")}
              </span>
              <span class="mb-2 block text-xs text-white/40">
                ${translateText("account_modal.display_name_desc")}
              </span>
              <input
                .value=${this.profileDisplayName}
                @input=${(e: Event) =>
                  (this.profileDisplayName = (
                    e.target as HTMLInputElement
                  ).value)}
                minlength="3"
                maxlength="27"
                class="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-malibu-blue"
              />
            </label>
            <label class="block">
              <span
                class="mb-1 block text-xs font-bold uppercase tracking-wider text-white/50"
              >
                ${translateText("account_modal.profile_bio")}
              </span>
              <span class="mb-2 block text-xs text-white/40">
                ${translateText("account_modal.profile_bio_desc")}
              </span>
              <textarea
                .value=${this.profileBio}
                @input=${(e: Event) =>
                  (this.profileBio = (e.target as HTMLTextAreaElement).value)}
                maxlength="160"
                rows="3"
                class="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-malibu-blue"
              ></textarea>
            </label>
            <label class="flex items-center justify-between gap-4">
              <span
                class="text-xs font-bold uppercase tracking-wider text-white/50"
              >
                ${translateText("account_modal.banner_color")}
                <small
                  class="mt-1 block max-w-md normal-case tracking-normal text-white/40"
                >
                  ${translateText("account_modal.banner_color_desc")}
                </small>
              </span>
              <input
                type="color"
                .value=${this.profileBannerColor}
                @input=${(e: Event) =>
                  (this.profileBannerColor = (
                    e.target as HTMLInputElement
                  ).value)}
                class="h-10 w-16 cursor-pointer rounded-lg border border-white/10 bg-transparent"
              />
            </label>
            ${this.profileMessage
              ? html`<div
                  role=${this.profileMessageError ? "alert" : "status"}
                  class=${`rounded-xl border px-4 py-3 text-sm ${
                    this.profileMessageError
                      ? "border-red-400/30 bg-red-500/10 text-red-200"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                  }`}
                >
                  ${this.profileMessage}
                </div>`
              : ""}
            <o-button
              variant="primary"
              width="block"
              size="md"
              translationKey="account_modal.save_profile"
              .disable=${this.profileSaving ||
              this.profileDisplayName.trim().length < 3}
              @click=${this.handleSaveProfile}
            ></o-button>
          </div>
        </div>
        ${this.renderSubscriptionPanel()} ${this.renderAccountDangerZone()}
      </div>
    `;
  }

  // CrazyGames "connected as" view: avatar + username from the SDK, plus
  // currency/subscription. No Discord/Google/email link or logout (CrazyGames
  // owns the account and its logout).
  private renderCrazyGamesAccount(user: CrazyGamesUser): TemplateResult {
    return html`
      <div class="flex flex-col gap-6">
        <div class="bg-white/5 rounded-xl border border-white/10 p-6">
          <div class="flex flex-col items-center gap-4">
            <div
              class="text-xs text-white/40 uppercase tracking-widest font-bold border-b border-white/5 pb-2 px-8"
            >
              ${translateText("account_modal.connected_as")}
            </div>
            <div class="flex flex-col items-center gap-3">
              <img
                src=${user.profilePictureUrl}
                alt=${user.username}
                class="w-16 h-16 rounded-full object-cover"
                referrerpolicy="no-referrer"
              />
              <div class="text-white text-lg font-medium">${user.username}</div>
              ${this.renderCurrency()}
            </div>
          </div>
        </div>
        ${this.renderSubscriptionPanel()}
      </div>
    `;
  }

  // Shown when a CrazyGames guest opens the modal: hand off to CrazyGames' own
  // sign-in prompt (no Discord/Google/email on CrazyGames).
  private renderCrazyGamesSignIn(): TemplateResult {
    return html`
      <div
        class="flex items-start justify-center px-6 pb-6 pt-[16vh] min-h-full"
      >
        <div
          class="w-full max-w-md bg-white/5 rounded-2xl border border-white/10 p-8 text-center"
        >
          <p class="text-white/50 text-sm font-medium mb-6">
            ${translateText("account_modal.sign_in_desc")}
          </p>
          <o-button
            variant="primary"
            width="block"
            size="md"
            translationKey="main.sign_in"
            @click=${this.handleCrazyGamesSignIn}
          ></o-button>
        </div>
      </div>
    `;
  }

  private renderStatsTab(): TemplateResult {
    if (!this.hasAnyStats()) {
      return this.renderEmptyState(
        "📊",
        translateText("account_modal.no_stats"),
      );
    }
    return html`
      <div class="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span class="text-blue-400">📊</span>
          ${translateText("account_modal.stats_overview")}
        </h3>
        <player-stats-tree-view
          .statsTree=${this.statsTree}
        ></player-stats-tree-view>
      </div>
    `;
  }

  private renderGamesTab(): TemplateResult {
    const publicId = this.userMeResponse?.player?.publicId ?? "";
    if (!publicId) {
      return this.renderEmptyState(
        "🎮",
        translateText("account_modal.no_games"),
      );
    }
    return html`
      <player-game-history-view
        .publicId=${publicId}
        .cachedState=${this.gameHistoryCache?.publicId === publicId
          ? this.gameHistoryCache
          : null}
        @history-updated=${(e: CustomEvent<PlayerGameHistoryCache>) => {
          this.gameHistoryCache = e.detail;
        }}
        @view-game=${(e: CustomEvent<{ gameId: string }>) =>
          void this.viewGame(e.detail.gameId)}
      ></player-game-history-view>
    `;
  }

  private renderEmptyState(icon: string, message: string): TemplateResult {
    return html`
      <div
        class="bg-white/5 rounded-xl border border-white/10 p-12 flex flex-col items-center justify-center text-center"
      >
        <div class="text-4xl mb-3">${icon}</div>
        <p class="text-white/60 text-sm">${message}</p>
      </div>
    `;
  }

  private renderSubscriptionPanel(): TemplateResult | "" {
    if (!SUBSCRIPTIONS_ENABLED) return "";
    const sub = this.userMeResponse?.player?.subscription;
    if (!sub) return "";
    const cosmetic = this.cosmetics?.subscriptions?.[sub.tier] ?? null;
    return html`<subscription-panel
      .sub=${sub}
      .cosmetic=${cosmetic}
    ></subscription-panel>`;
  }

  private renderCurrency(): TemplateResult {
    const currency = this.userMeResponse?.player?.currency;
    if (!currency) return html``;

    return html`
      <currency-display
        .hard=${currency.hard}
        .soft=${currency.soft}
      ></currency-display>
    `;
  }

  private renderLoggedInAs(): TemplateResult {
    const me = this.userMeResponse?.user;
    if (me?.email) {
      return html`
        <div class="flex flex-col items-center gap-3 w-full">
          <div class="text-white text-lg font-medium">
            ${translateText("account_modal.linked_account", {
              account_name: me.email,
            })}
          </div>
          ${this.renderCurrency()}
        </div>
      `;
    }
    return html``;
  }

  private syncProfileFields(userMe: UserMeResponse) {
    this.profileDisplayName = userMe.user.displayName ?? "";
    this.profileBio = userMe.user.bio ?? "";
    this.profileBannerColor = userMe.user.bannerColor ?? "#1689d8";
  }

  private handleSaveProfile = async () => {
    if (this.profileSaving) return;
    if (!this.profileDisplayName.trim()) {
      this.profileMessageError = true;
      this.profileMessage = translateText(
        "account_modal.display_name_required",
      );
      return;
    }
    this.profileSaving = true;
    this.profileMessage = "";
    const updated = await updateMyProfile({
      displayName: this.profileDisplayName.trim(),
      bio: this.profileBio.trim(),
      bannerColor: this.profileBannerColor,
    });
    this.profileSaving = false;
    if (!updated) {
      this.profileMessageError = true;
      this.profileMessage = translateText("account_modal.profile_save_failed");
      return;
    }
    this.userMeResponse = updated;
    this.syncProfileFields(updated);
    this.profileMessageError = false;
    this.profileMessage = translateText("account_modal.profile_saved");
    // Refresh the shared cache and nav button so the new name shows up in the
    // top-bar Profile button (and store, etc.) immediately, and every time the
    // player changes it — no page reload required.
    this.propagateLogin(updated);
    window.dispatchEvent(
      new CustomEvent("openback-profile-updated", {
        detail: { displayName: updated.user.displayName },
      }),
    );
    this.close();
  };

  private async viewGame(gameId: string): Promise<void> {
    this.close();
    const encodedGameId = encodeURIComponent(gameId);
    const newUrl = `/${ClientEnv.workerPath(gameId)}/game/${encodedGameId}`;

    history.pushState({ join: gameId }, "", newUrl);
    window.dispatchEvent(
      new CustomEvent("join-changed", { detail: { gameId: encodedGameId } }),
    );
  }

  private renderLogoutButton(): TemplateResult {
    return html`
      <o-button
        variant="primary"
        size="md"
        translationKey="account_modal.log_out"
        @click=${() => (this.dangerAction = "logout")}
      ></o-button>
    `;
  }

  private renderAccountDangerZone(): TemplateResult {
    return html`
      <div class="grid gap-4 md:grid-cols-2">
        <section
          class="rounded-xl border border-malibu-blue/20 bg-malibu-blue/5 p-6"
        >
          <h3
            class="text-sm font-black uppercase tracking-wider text-malibu-blue"
          >
            ${translateText("account_modal.log_out")}
          </h3>
          <p class="mb-4 mt-1 text-xs leading-5 text-white/45">
            ${translateText("account_modal.log_out_short_desc")}
          </p>
          ${this.renderLogoutButton()}
        </section>
        <section class="rounded-xl border border-red-400/20 bg-red-500/5 p-6">
          <h3 class="text-sm font-black uppercase tracking-wider text-red-200">
            ${translateText("account_modal.delete_account")}
          </h3>
          <p class="mb-4 mt-1 text-xs leading-5 text-white/45">
            ${translateText("account_modal.delete_account_short_desc")}
          </p>
          <o-button
            variant="danger"
            size="md"
            translationKey="account_modal.delete_account"
            @click=${() => (this.dangerAction = "delete-first")}
          ></o-button>
        </section>
      </div>
    `;
  }

  private renderDangerConfirmation(): TemplateResult {
    const deleting = this.dangerAction?.startsWith("delete") ?? false;
    const finalDelete = this.dangerAction === "delete-final";
    const title = finalDelete
      ? translateText("account_modal.delete_account_final_title")
      : deleting
        ? translateText("account_modal.delete_account_title")
        : translateText("account_modal.log_out_title");
    const description = finalDelete
      ? translateText("account_modal.delete_account_final_desc")
      : deleting
        ? translateText("account_modal.delete_account_desc")
        : translateText("account_modal.log_out_desc");
    return html`
      <div
        class="flex min-h-full items-start justify-center px-6 pb-8 pt-[11vh]"
      >
        <div
          class="w-full max-w-xl rounded-2xl border border-red-400/25 bg-[#0b111d] p-8 text-center shadow-2xl"
        >
          <div
            class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-3xl text-red-300"
          >
            !
          </div>
          <h2
            class=${`text-2xl text-white ${
              finalDelete ? "font-black uppercase" : "font-bold"
            }`}
          >
            ${title}
          </h2>
          <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/60">
            ${description}
          </p>
          ${this.accountActionError
            ? html`<div
                role="alert"
                class="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                ${this.accountActionError}
              </div>`
            : ""}
          <div
            class="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center"
          >
            <o-button
              variant="secondary"
              size="md"
              translationKey="common.cancel"
              .disable=${this.accountActionBusy}
              @click=${() => this.cancelDangerAction()}
            ></o-button>
            <o-button
              variant=${deleting ? "danger" : "primary"}
              size="md"
              .translationKey=${finalDelete
                ? "account_modal.delete_account_forever"
                : deleting
                  ? "account_modal.continue_delete"
                  : "account_modal.confirm_log_out"}
              .disable=${this.accountActionBusy}
              @click=${finalDelete
                ? this.handleDeleteAccount
                : deleting
                  ? () => (this.dangerAction = "delete-final")
                  : this.handleLogout}
            ></o-button>
          </div>
        </div>
      </div>
    `;
  }

  private cancelDangerAction() {
    this.dangerAction = null;
    this.accountActionError = "";
  }

  private renderLoginOptions() {
    if (!this.authMode) return this.renderAuthChooser();
    const isSignup = this.authMode === "signup";
    return html`
      <div
        class="flex min-h-full items-start justify-center px-6 pb-8 pt-[14vh]"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b111d] p-8 shadow-2xl"
        >
          <button
            class="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white/45 transition-colors hover:text-white"
            @click=${() => this.chooseAuthMode(null)}
          >
            <span aria-hidden="true">&larr;</span>
            ${translateText("account_modal.back_to_account_choice")}
          </button>
          <div class="mb-8 text-center">
            <div
              class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-malibu-blue/25 bg-malibu-blue/10 text-2xl font-black text-malibu-blue"
            >
              OB
            </div>
            <h2 class="text-2xl font-black text-white">
              ${translateText(
                isSignup
                  ? "account_modal.sign_up_title"
                  : "account_modal.log_in_title",
              )}
            </h2>
            <p class="text-white/50 text-sm font-medium">
              ${translateText(
                isSignup
                  ? "account_modal.sign_up_desc"
                  : "account_modal.log_in_desc",
              )}
            </p>
          </div>

          <div class="space-y-6">
            <div class="space-y-3">
              <div class="relative group">
                <input
                  type="email"
                  id="email"
                  name="email"
                  .value="${this.email}"
                  @input="${this.handleEmailInput}"
                  class="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-malibu-blue/50 focus:border-malibu-blue/50 transition-all font-medium hover:bg-white/10"
                  placeholder="${translateText(
                    "account_modal.email_placeholder",
                  )}"
                  required
                />
              </div>
              ${!this.codeSent
                ? html`<o-button
                    variant="primary"
                    width="block"
                    size="md"
                    .translationKey=${isSignup
                      ? "account_modal.send_signup_code"
                      : "account_modal.send_login_code"}
                    .disable=${this.isAuthBusy}
                    @click=${this.handleSubmit}
                  ></o-button>`
                : html`
                    <div>
                      <p
                        class="mb-3 text-center text-xs font-medium text-white/50"
                      >
                        ${translateText("account_modal.enter_code")}
                      </p>
                      <div
                        class="grid grid-cols-6 gap-2"
                        @paste=${this.handleCodePaste}
                      >
                        ${Array.from(
                          { length: 6 },
                          (_, index) => html`
                            <input
                              type="text"
                              inputmode="numeric"
                              autocomplete=${index === 0
                                ? "one-time-code"
                                : "off"}
                              maxlength="1"
                              aria-label="Login code digit ${index + 1}"
                              data-code-index=${index}
                              .value=${this.code[index] ?? ""}
                              @input=${(event: Event) =>
                                this.handleCodeInput(event, index)}
                              @keydown=${(event: KeyboardEvent) =>
                                this.handleCodeKeydown(event, index)}
                              class="h-14 min-w-0 rounded-xl border border-white/15 bg-black/20 text-center text-xl font-bold text-white outline-none transition-all hover:bg-white/10 focus:border-malibu-blue focus:bg-malibu-blue/10 focus:ring-2 focus:ring-malibu-blue/30"
                            />
                          `,
                        )}
                      </div>
                    </div>
                    <o-button
                      variant="primary"
                      width="block"
                      size="md"
                      translationKey="account_modal.verify_code"
                      .disable=${this.isAuthBusy || this.code.length !== 6}
                      @click=${this.handleVerify}
                    ></o-button>
                    <button
                      @click=${this.handleResend}
                      class="w-full text-[11px] font-bold text-white/30 hover:text-malibu-blue transition-colors uppercase tracking-widest"
                    >
                      ${translateText("account_modal.resend_code")}
                    </button>
                  `}
              ${this.authMessage
                ? html`<div
                    role=${this.authMessageType === "error"
                      ? "alert"
                      : "status"}
                    class=${`rounded-xl border px-4 py-3 text-sm font-medium ${
                      this.authMessageType === "error"
                        ? "border-red-400/30 bg-red-500/10 text-red-200"
                        : this.authMessageType === "success"
                          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : "border-blue-400/30 bg-blue-500/10 text-blue-200"
                    }`}
                  >
                    ${this.authMessage}
                    ${this.authSuggestedAction
                      ? html`<button
                          class="mt-3 block font-black underline underline-offset-2"
                          @click=${() =>
                            this.chooseAuthMode(this.authSuggestedAction)}
                        >
                          ${translateText(
                            this.authSuggestedAction === "signup"
                              ? "account_modal.switch_to_signup"
                              : "account_modal.switch_to_login",
                          )}
                        </button>`
                      : ""}
                  </div>`
                : ""}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private renderAuthChooser(): TemplateResult {
    return html`
      <div
        class="flex min-h-full items-start justify-center px-6 pb-8 pt-[16vh]"
      >
        <div class="w-full max-w-2xl text-center">
          <div
            class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-malibu-blue/25 bg-malibu-blue/10 text-2xl font-black text-malibu-blue"
          >
            OB
          </div>
          <h2 class="text-3xl font-black text-white">
            ${translateText("account_modal.auth_choice_title")}
          </h2>
          <p class="mx-auto mt-2 max-w-xl text-sm text-white/50">
            ${translateText("account_modal.auth_choice_desc")}
          </p>
          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <button
              class="rounded-2xl border border-malibu-blue/30 bg-malibu-blue/10 p-6 text-left transition hover:border-malibu-blue hover:bg-malibu-blue/15"
              @click=${() => this.chooseAuthMode("signup")}
            >
              <strong class="block text-xl text-white">
                ${translateText("account_modal.sign_up")}
              </strong>
              <span class="mt-2 block text-sm leading-6 text-white/55">
                ${translateText("account_modal.sign_up_choice_desc")}
              </span>
            </button>
            <button
              class="rounded-2xl border border-malibu-blue/30 bg-malibu-blue/10 p-6 text-left transition hover:border-malibu-blue hover:bg-malibu-blue/15"
              @click=${() => this.chooseAuthMode("login")}
            >
              <strong class="block text-xl text-white">
                ${translateText("account_modal.log_in")}
              </strong>
              <span class="mt-2 block text-sm leading-6 text-white/55">
                ${translateText("account_modal.log_in_choice_desc")}
              </span>
            </button>
          </div>
          ${ClientEnv.googleEnabled()
            ? html`<button
                class="mt-5 text-sm font-bold text-white/55 underline underline-offset-4 hover:text-white"
                @click=${this.handleGoogleLogin}
              >
                ${translateText("main.login_google")}
              </button>`
            : ""}
        </div>
      </div>
    `;
  }

  private chooseAuthMode(mode: EmailAuthMode | null) {
    this.authMode = mode;
    this.codeSent = false;
    this.code = "";
    this.authMessage = "";
    this.authSuggestedAction = null;
  }

  private handleEmailInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.email = target.value;
    this.authMessage = "";
  }

  private handleCodeInput(e: Event, index: number) {
    const target = e.target as HTMLInputElement;
    const digit = target.value.replace(/\D/g, "").slice(-1);
    const digits = Array.from({ length: 6 }, (_, i) => this.code[i] ?? "");
    digits[index] = digit;
    this.code = digits.join("");
    target.value = digit;
    this.authMessage = "";
    if (digit && index < 5) this.focusCodeInput(index + 1);
  }

  private handleCodeKeydown(e: KeyboardEvent, index: number) {
    if (e.key === "Backspace" && !this.code[index] && index > 0) {
      const digits = Array.from({ length: 6 }, (_, i) => this.code[i] ?? "");
      digits[index - 1] = "";
      this.code = digits.join("");
      this.focusCodeInput(index - 1);
    }
  }

  private handleCodePaste(e: ClipboardEvent) {
    const pasted = e.clipboardData
      ?.getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    this.code = pasted;
    this.authMessage = "";
    this.updateComplete.then(() =>
      this.focusCodeInput(Math.min(pasted.length, 6) - 1),
    );
  }

  private focusCodeInput(index: number) {
    this.updateComplete.then(() => {
      this.renderRoot
        .querySelector<HTMLInputElement>(`[data-code-index="${index}"]`)
        ?.focus();
    });
  }

  private async handleSubmit() {
    if (!this.authMode) return;
    if (!this.email) {
      this.authMessageType = "error";
      this.authMessage = translateText("account_modal.enter_email_address");
      return;
    }
    this.isAuthBusy = true;
    this.authMessage = "";
    this.authSuggestedAction = null;
    const result = await requestLoginCode(this.email.trim(), this.authMode);
    this.isAuthBusy = false;
    if (result.ok) {
      this.codeSent = true;
      this.authMessageType = "success";
      if (result.devCode) {
        // Dev-only: the code is logged to the server console and echoed here.
        this.code = result.devCode;
        this.authMessage = translateText("account_modal.dev_code", {
          code: result.devCode,
        });
      } else {
        this.authMessage = translateText("account_modal.login_code_sent", {
          email: this.email,
        });
      }
      await this.updateComplete;
      this.focusCodeInput(0);
    } else {
      this.authMessageType = "error";
      this.authSuggestedAction = result.nextAction ?? null;
      this.authMessage =
        result.error === "account_exists"
          ? translateText("account_modal.account_exists")
          : result.error === "not_registered"
            ? translateText("account_modal.not_registered")
            : translateText("account_modal.failed_to_send_login_code");
    }
  }

  private async handleVerify() {
    if (!this.authMode) return;
    if (this.code.length !== 6) {
      this.authMessageType = "error";
      this.authMessage = translateText("account_modal.enter_code");
      return;
    }
    this.isAuthBusy = true;
    this.authMessage = "";
    this.authSuggestedAction = null;
    const result = await verifyLoginCode(this.email, this.code, this.authMode);
    this.isAuthBusy = false;
    if (result.ok) {
      invalidateUserMe();
      const userMe = await getUserMe();
      if (userMe) {
        this.userMeResponse = userMe;
        this.propagateLogin(userMe);
      }
      this.codeSent = false;
      this.code = "";
      this.authMode = null;
      this.authMessage = "";
      this.requestUpdate();
    } else {
      this.authMessageType = "error";
      this.authSuggestedAction = result.nextAction ?? null;
      this.authMessage =
        result.error === "account_exists"
          ? translateText("account_modal.account_exists")
          : result.error === "not_registered"
            ? translateText("account_modal.not_registered")
            : result.error === "code_expired"
              ? translateText("account_modal.code_expired")
              : result.error === "too_many_attempts"
                ? translateText("account_modal.too_many_attempts")
                : translateText("account_modal.invalid_code");
    }
  }

  private async handleResend() {
    this.codeSent = false;
    this.code = "";
    this.authMessage = "";
    await this.handleSubmit();
  }

  private handleGoogleLogin() {
    googleLogin();
  }

  // CrazyGames sign-in: after their prompt completes, exchange the new token
  // for a session and refresh the modal so it shows the signed-in profile.
  private async handleCrazyGamesSignIn() {
    await crazyGamesSDK.showAuthPrompt();
    const profile = await crazyGamesSDK.getUserProfile();
    if (!profile) return; // prompt cancelled / still not signed in
    invalidateUserMe();
    await reauthAfterCrazyGamesChange();
    const userMe = await getUserMe();
    if (userMe) {
      this.userMeResponse = userMe;
      this.propagateLogin(userMe);
    }
    this.crazyGamesUser = profile;
    this.requestUpdate();
  }

  // After a mid-session login (email code or CrazyGames), the rest of the app
  // still thinks we're logged out because nothing re-ran the startup auth flow.
  // Seed the shared cache and broadcast `userMeResponse` so the nav button,
  // store, flag/skin selectors and every other listener update immediately —
  // no page reload required.
  private propagateLogin(userMe: UserMeResponse) {
    setLastUserMe(userMe);
    document.dispatchEvent(
      new CustomEvent("userMeResponse", {
        detail: userMe,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  protected onOpen(): void {
    document.body.classList.add("account-flow-open");
    this.isLoadingUser = true;
    this.authMode = null;
    this.authSuggestedAction = null;
    this.codeSent = false;
    this.code = "";
    this.authMessage = "";
    this.dangerAction = null;
    this.accountActionError = "";

    this.refreshCrazyGamesUser();

    if (SUBSCRIPTIONS_ENABLED) {
      void fetchCosmetics().then((cosmetics) => {
        this.cosmetics = cosmetics;
        this.requestUpdate();
      });
    }

    void getUserMe()
      .then((userMe) => {
        if (userMe) {
          this.userMeResponse = userMe;
          this.syncProfileFields(userMe);
          if (this.userMeResponse?.player?.publicId) {
            this.loadPlayerProfile(this.userMeResponse.player.publicId);
          }
        }
        this.isLoadingUser = false;
        this.requestUpdate();
      })
      .catch((err) => {
        console.warn("Failed to fetch user info in AccountModal.open():", err);
        this.isLoadingUser = false;
        this.requestUpdate();
      });
    this.requestUpdate();
  }

  protected onClose(): void {
    document.body.classList.remove("account-flow-open");
    this.dispatchEvent(
      new CustomEvent("close", { bubbles: true, composed: true }),
    );
  }

  private async handleLogout() {
    if (this.accountActionBusy) return;
    this.accountActionBusy = true;
    this.accountActionError = "";
    const ok = await logOut();
    this.accountActionBusy = false;
    if (!ok) {
      this.accountActionError = translateText("account_modal.log_out_failed");
      return;
    }
    this.close();
    window.location.reload();
  }

  private handleDeleteAccount = async () => {
    if (this.accountActionBusy) return;
    this.accountActionBusy = true;
    this.accountActionError = "";
    const ok = await deleteAccount();
    this.accountActionBusy = false;
    if (!ok) {
      this.accountActionError = translateText(
        "account_modal.delete_account_failed",
      );
      return;
    }
    this.close();
    window.location.reload();
  };

  private async loadPlayerProfile(publicId: string): Promise<void> {
    try {
      const data = await fetchPlayerById(publicId);
      if (!data) {
        this.requestUpdate();
        return;
      }

      this.statsTree = data.stats;

      this.requestUpdate();
    } catch (err) {
      console.warn("Failed to load player data:", err);
      this.requestUpdate();
    }
  }
}
