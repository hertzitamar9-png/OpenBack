import { html, LitElement, nothing, render, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { UserMeResponse } from "../../core/ApiSchemas";
import { hasLinkedIdentity } from "../AccountIdentity";
import { appRouter } from "../AppRouter";
import { logOut } from "../Auth";
import { crazyGamesSDK, type CrazyGamesUser } from "../CrazyGamesSDK";
import { showInGameConfirm } from "../InGameModal";
import {
  latestUserMeResponse,
  updateAccountNavButton,
} from "../NavAccountButton";
import { closeMobileSidebar } from "../Navigation";
import { openAccountSettings } from "../utilities/OpenOwnProfile";
import { playerProfileUrl } from "../utilities/PlayerProfileUrl";
import { copyToClipboard, showToast, translateText } from "../Utils";

type MenuItem = {
  key: string;
  labelKey: string;
  icon: TemplateResult;
  onSelect: () => void;
  danger?: boolean;
};

/**
 * The nav profile control: signed-out users get one direct Sign In / Sign Up
 * button. Once signed in, the avatar and chevron open the account actions menu
 * (account settings, username, subscription, log out). Game settings live in
 * the dedicated nav gear.
 *
 * The component owns the click in both states so signed-out users never see a
 * redundant one-item dropdown before reaching the account screen.
 *
 * `variant="desktop"` also carries the legacy element ids the imperative
 * updaters (NavAccountButton, CrazyGamesAccountButton) drive; every instance
 * additionally exposes `data-account-*` hooks so both trigger layouts stay in
 * sync from one update call.
 */
@customElement("nav-account-menu")
export class NavAccountMenu extends LitElement {
  @property({ type: String }) variant: "desktop" | "mobile" = "desktop";

  @state() private menuOpen = false;
  @state() private userMeResponse: UserMeResponse | false = false;
  // CrazyGames identities come from the SDK, not our user object.
  @state() private crazyGamesUser: CrazyGamesUser | null = null;

  // The panel is rendered into document.body, not into the nav: the nav bar
  // owns a stacking context, so anything inside it can be painted under the
  // page's overlays (modals) or paint over ones that should win (toasts).
  private panel: HTMLDivElement | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener(
      "userMeResponse",
      this.handleUserMeResponse as EventListener,
    );
    document.addEventListener("click", this.handleDocumentClick);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("showPage", this.closeMenu);
    // The panel is positioned from the trigger's box, so a resize would leave
    // it stranded — close instead of tracking.
    window.addEventListener("resize", this.closeMenu);

    // Auth resolves once, early. A menu created after that (a re-rendered play
    // page, a reconnected element) would otherwise sit on its initial
    // signed-out state forever, so seed from the cached response instead.
    this.refreshCrazyGamesUser();

    const cached = latestUserMeResponse();
    if (cached !== null) {
      this.userMeResponse = cached;
      // The trigger's avatar/badge state is imperative, so re-apply it to this
      // instance's freshly-rendered markup too.
      void this.updateComplete.then(() => updateAccountNavButton(cached));
    }
  }

  disconnectedCallback() {
    document.removeEventListener(
      "userMeResponse",
      this.handleUserMeResponse as EventListener,
    );
    document.removeEventListener("click", this.handleDocumentClick);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("showPage", this.closeMenu);
    window.removeEventListener("resize", this.closeMenu);
    this.removePanel();
    super.disconnectedCallback();
  }

  protected updated(): void {
    if (!this.menuOpen) {
      this.removePanel();
      return;
    }
    const trigger = this.querySelector<HTMLElement>("[data-account-trigger]");
    if (!trigger) return;

    if (this.panel === null) {
      this.panel = document.createElement("div");
      this.panel.style.position = "fixed";
      this.panel.style.zIndex = "41000";
      document.body.appendChild(this.panel);
    }
    const rect = trigger.getBoundingClientRect();
    this.panel.style.top = `${rect.bottom + 8}px`;
    this.panel.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    render(this.renderMenu(), this.panel);
  }

  private removePanel(): void {
    if (this.panel === null) return;
    render(nothing, this.panel);
    this.panel.remove();
    this.panel = null;
  }

  private handleUserMeResponse = (
    event: CustomEvent<UserMeResponse | false>,
  ) => {
    this.userMeResponse = event.detail;
    if (!this.isSignedIn()) this.menuOpen = false;
    // A CrazyGames sign-in surfaces as a userMeResponse, so re-read the SDK
    // profile alongside it.
    this.refreshCrazyGamesUser();
  };

  private refreshCrazyGamesUser(): void {
    if (!crazyGamesSDK.isOnCrazyGames()) return;
    void crazyGamesSDK.getUserProfile().then((user) => {
      this.crazyGamesUser = user;
    });
  }

  /**
   * Signed in for menu purposes. An anonymous session still resolves to a
   * UserMeResponse, so a linked identity is what counts — plus, on CrazyGames,
   * an SDK profile whose token exchange produced a session.
   */
  private isSignedIn(): boolean {
    if (this.userMeResponse === false) return false;
    return (
      hasLinkedIdentity(this.userMeResponse.user) ||
      this.crazyGamesUser !== null
    );
  }

  private closeMenu = () => {
    this.menuOpen = false;
  };

  private handleDocumentClick = (e: MouseEvent) => {
    if (!this.menuOpen) return;
    const path = e.composedPath();
    if (path.includes(this)) return;
    if (this.panel !== null && path.includes(this.panel)) return;
    this.menuOpen = false;
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.menuOpen) {
      this.menuOpen = false;
    }
  };

  private handleTriggerClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!this.isSignedIn()) {
      this.signIn();
      return;
    }
    // The pill says PROFILE, so pressing it opens the account page -- account,
    // stats, games and friends. Only the little chevron beside it opens the
    // shortcut menu; pressing the pill used to give that menu and there was no
    // way to reach the account page from the bar at all.
    const onChevron = (e.target as HTMLElement | null)?.closest(
      "[data-account-chevron]",
    );
    if (!onChevron) {
      this.menuOpen = false;
      openAccountSettings();
      return;
    }
    this.menuOpen = !this.menuOpen;
  };

  private items(): MenuItem[] {
    if (!this.isSignedIn()) return [];

    const player =
      this.userMeResponse === false ? null : this.userMeResponse.player;
    const subscribed =
      player?.subscription !== undefined && player?.subscription !== null;
    const publicId = player?.publicId ?? "";

    const items: MenuItem[] = [];

    // Nothing to share without a publicId (older backend, or a session whose
    // player record hasn't resolved).
    if (publicId) {
      items.push({
        key: "copy-profile-url",
        labelKey: "nav_account_menu.copy_profile_url",
        icon: iconShare,
        onSelect: () => void this.copyProfileUrl(publicId),
      });
    }

    items.push(
      {
        key: "view-account",
        labelKey: "nav_account_menu.view_account",
        icon: iconUser,
        onSelect: () => {
          void appRouter.navigate({ pageId: "page-account" });
        },
      },
      ...(player?.analyticsAccess
        ? [
            {
              key: "analytics",
              labelKey: "nav_account_menu.analytics",
              icon: iconAnalytics,
              onSelect: () => {
                void appRouter.navigate({ pageId: "page-analytics" });
              },
            },
          ]
        : []),
      {
        key: "account-settings",
        labelKey: "nav_account_menu.account_settings",
        icon: iconGear,
        onSelect: () => this.openModal("account-settings"),
      },
      {
        key: "change-username",
        labelKey: "nav_account_menu.change_username",
        icon: iconTag,
        onSelect: () => this.openModal("change-username"),
      },
    );

    if (subscribed) {
      items.push({
        key: "subscription",
        labelKey: "nav_account_menu.change_subscription",
        icon: iconCard,
        onSelect: () => this.openModal("subscription"),
      });
    }

    // CrazyGames owns its own sessions: signing out happens on their site, and
    // our /auth/logout wouldn't end theirs.
    if (!crazyGamesSDK.isOnCrazyGames()) {
      items.push({
        key: "log-out",
        labelKey: "nav_account_menu.log_out",
        icon: iconLogOut,
        onSelect: () => void this.handleLogOut(),
        danger: true,
      });
    }

    return items;
  }

  // CrazyGames players sign in through the SDK prompt; everyone else through
  // the account modal's login options.
  private signIn(): void {
    if (crazyGamesSDK.isOnCrazyGames()) {
      void crazyGamesSDK.showAuthPrompt();
      return;
    }
    void appRouter.navigate({ pageId: "page-account" });
  }

  // Same copy + toast the account modal's share button gives.
  private async copyProfileUrl(publicId: string): Promise<void> {
    try {
      await copyToClipboard(playerProfileUrl(publicId));
      showToast(translateText("common.copied"), "green");
    } catch {
      showToast(translateText("error_modal.failed_copy"), "red");
    }
  }

  // Profile-menu panels are transient overlays, so opening one must not replace
  // the clean path of the page underneath it.
  private openModal(name: string): void {
    const tag = `${name}-modal`;
    document.querySelector<HTMLElement & { open(): void }>(tag)?.open();
  }

  private async handleLogOut(): Promise<void> {
    const confirmed = await showInGameConfirm(
      translateText("nav_account_menu.log_out_confirm"),
      {
        heading: translateText("nav_account_menu.log_out"),
        confirmText: translateText("nav_account_menu.log_out"),
      },
    );
    if (!confirmed) return;
    await logOut();
    // Reload so every consumer of the session starts from a signed-out state.
    window.location.reload();
  }

  private selectItem(item: MenuItem): void {
    this.menuOpen = false;
    closeMobileSidebar();
    item.onSelect();
  }

  render(): TemplateResult {
    return html`
      <div class="relative" data-account-nav>
        ${this.variant === "mobile"
          ? this.renderMobileTrigger()
          : this.renderDesktopTrigger()}
      </div>
    `;
  }

  private renderMenu(): TemplateResult {
    return html`
      <!-- No vertical padding on the panel: items run edge to edge so a hovered
           row (the red Log out especially) fills the corner instead of leaving
           a dead strip under it. overflow-hidden clips them to the radius.

           Width grows to the longest label (translations run longer than the
           English) up to a cap, past which labels wrap instead of pushing the
           panel off-screen — the cap also tracks the viewport for narrow
           phones. -->
      <div
        role="menu"
        aria-label=${translateText("nav_account_menu.title")}
        class="w-max min-w-60 max-w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-white/10 bg-zinc-900 shadow-xl overflow-hidden"
      >
        ${this.items().map(
          (item) => html`
            <button
              role="menuitem"
              data-menu-item=${item.key}
              @click=${() => this.selectItem(item)}
              class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium normal-case tracking-normal cursor-pointer transition-colors ${item.danger
                ? "text-red-400 hover:bg-red-500/10 border-t border-white/10"
                : "text-white/80 hover:bg-white/10 hover:text-white"}"
            >
              <span class="w-4 h-4 shrink-0">${item.icon}</span>
              <span class="min-w-0 break-words"
                >${translateText(item.labelKey)}</span
              >
            </button>
          `,
        )}
      </div>
    `;
  }

  private renderChevron(): TemplateResult {
    return html`
      <svg
        data-account-chevron
        class="w-3 h-3 shrink-0 transition-transform ${this.menuOpen
          ? "rotate-180"
          : ""}"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    `;
  }

  // Avatar / spinner / person icon / email badge, shared by both triggers.
  // `ids` is populated for the desktop instance only — NavAccountButton and
  // CrazyGamesAccountButton drive that one by id — while the data-account-*
  // hooks are what both instances are updated through.
  private renderIdentityIcons(opts: {
    ids: boolean;
    iconClass: string;
    badgeClass: string;
  }): TemplateResult {
    const id = (name: string) => (opts.ids ? name : undefined);
    return html`
      <img
        id=${ifDefined(id("nav-account-avatar"))}
        data-account-avatar
        class="hidden w-8 h-8 rounded-full object-cover"
        alt=""
        data-i18n-alt="main.discord_avatar_alt"
        referrerpolicy="no-referrer"
      />
      <span
        id=${ifDefined(id("nav-account-loading-spinner"))}
        data-account-spinner
        class="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin"
        aria-hidden="true"
      ></span>
      <svg
        id=${ifDefined(id("nav-account-person-icon"))}
        data-account-person-icon
        class="hidden ${opts.iconClass}"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M20 21a8 8 0 0 0-16 0" />
        <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      </svg>
      <span
        id=${ifDefined(id("nav-account-email-badge"))}
        data-account-email-badge
        class="hidden ${opts.badgeClass} w-4 h-4 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          class="w-2.5 h-2.5 text-white/80"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </span>
    `;
  }

  // Desktop nav pill. Ids are load-bearing: NavAccountButton and
  // CrazyGamesAccountButton drive this instance by id.
  private renderDesktopTrigger(): TemplateResult {
    const signedIn = this.isSignedIn();
    return html`
      <button
        id="nav-account-button"
        data-account-trigger
        data-account-border
        aria-haspopup=${ifDefined(signedIn ? "menu" : undefined)}
        aria-expanded=${ifDefined(
          signedIn ? (this.menuOpen ? "true" : "false") : undefined,
        )}
        @click=${this.handleTriggerClick}
        class="nav-menu-item relative h-10 rounded-full flex items-center justify-center gap-2 px-3 bg-transparent border border-white/20 text-white/80 hover:text-white cursor-pointer transition-colors [&.active]:text-white"
        data-page="page-account"
        data-i18n-aria-label="main.account"
        data-i18n-title="main.account"
      >
        ${this.renderIdentityIcons({
          ids: true,
          iconClass: "w-5 h-5",
          badgeClass: "absolute bottom-1 right-1",
        })}
        <span
          id="nav-account-signin-text"
          data-account-signin-text
          class="hidden text-xs font-bold tracking-widest"
          data-i18n="main.sign_in"
        >
        </span>
        ${signedIn ? this.renderChevron() : nothing}
      </button>
    `;
  }

  // Mobile top-bar trigger: avatar or person icon only, plus the chevron.
  private renderMobileTrigger(): TemplateResult {
    const signedIn = this.isSignedIn();
    return html`
      <button
        data-account-trigger
        aria-haspopup=${ifDefined(signedIn ? "menu" : undefined)}
        aria-expanded=${ifDefined(
          signedIn ? (this.menuOpen ? "true" : "false") : undefined,
        )}
        @click=${this.handleTriggerClick}
        class="nav-menu-item h-10 flex items-center justify-center gap-1 pl-1 pr-1.5 rounded-full text-white/90 cursor-pointer transition-colors"
        data-page="page-account"
        data-i18n-aria-label="main.account"
        data-i18n-title="main.account"
      >
        <span class="relative flex items-center justify-center w-8 h-8">
          ${this.renderIdentityIcons({
            ids: false,
            iconClass: "w-7 h-7",
            badgeClass: "absolute -bottom-0.5 -right-0.5",
          })}
        </span>
        <!-- The sign-in label is desktop-only; on the top bar the icon alone is
             the affordance, so keep the element (the shared updater toggles it)
             but never show text. -->
        <span
          data-account-signin-text
          data-account-signin-text-silent
          class="hidden"
        ></span>
        ${signedIn ? this.renderChevron() : nothing}
      </button>
    `;
  }
}

const iconShare = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="w-full h-full"
  aria-hidden="true"
>
  <circle cx="18" cy="5" r="3" />
  <circle cx="6" cy="12" r="3" />
  <circle cx="18" cy="19" r="3" />
  <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
  <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
</svg>`;

const iconUser = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="w-full h-full"
  aria-hidden="true"
>
  <path d="M20 21a8 8 0 0 0-16 0" />
  <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
</svg>`;

const iconAnalytics = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="w-full h-full"
  aria-hidden="true"
>
  <path d="M4 19V9" />
  <path d="M10 19V5" />
  <path d="M16 19v-7" />
  <path d="M22 19V2" />
  <path d="M2 19h22" />
</svg>`;

const iconGear = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="w-full h-full"
  aria-hidden="true"
>
  <circle cx="12" cy="12" r="3" />
  <path
    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
  />
</svg>`;

const iconTag = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="w-full h-full"
  aria-hidden="true"
>
  <path
    d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"
  />
  <line x1="7" y1="7" x2="7.01" y2="7" />
</svg>`;

const iconCard = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="w-full h-full"
  aria-hidden="true"
>
  <rect x="2" y="5" width="20" height="14" rx="2" />
  <line x1="2" y1="10" x2="22" y2="10" />
</svg>`;

const iconLogOut = html`<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  class="w-full h-full"
  aria-hidden="true"
>
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
  <polyline points="16 17 21 12 16 7" />
  <line x1="21" y1="12" x2="9" y2="12" />
</svg>`;
