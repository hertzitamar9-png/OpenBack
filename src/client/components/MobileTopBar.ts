import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { assetUrl } from "../../core/AssetUrls";
import { crazyGamesSDK } from "../CrazyGamesSDK";

/**
 * The mobile top bar (menu button, logo, account).
 *
 * This lives outside `play-page` on purpose. It used to be rendered inside it,
 * so switching to any other tab hid `page-play` and took the menu button with
 * it, leaving no way to reach the menu from News, Clans, Settings and so on.
 *
 * The back button appears only on sub-pages. It asks the active page to close
 * its own inner view first by dispatching a cancelable `openback-back` event:
 * a page showing a single tutorial can consume it to return to the tutorial
 * list, so back walks out one level at a time and only leaves for Play once
 * the page is at its own top level.
 */
@customElement("mobile-top-bar")
export class MobileTopBar extends LitElement {
  @state() private onSubPage = false;

  private readonly onShowPage = (e: Event) => {
    const pageId = (e as CustomEvent<string>).detail;
    this.onSubPage = pageId !== "page-play";
  };

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.onSubPage = (window.currentPageId ?? "page-play") !== "page-play";
    window.addEventListener("showPage", this.onShowPage);
  }

  disconnectedCallback() {
    window.removeEventListener("showPage", this.onShowPage);
    super.disconnectedCallback();
  }

  private goBack() {
    const pageId = window.currentPageId ?? "page-play";
    const handled = !window.dispatchEvent(
      new CustomEvent("openback-back", {
        detail: pageId,
        cancelable: true,
      }),
    );
    // Nothing claimed the press, so this page was already at its top level.
    if (!handled) window.showPage?.("page-play");
  }

  render() {
    return html`
      <div
        class="lg:hidden fixed left-0 right-0 top-0 z-40 pt-[env(safe-area-inset-top)] bg-surface border-b border-white/10"
      >
        <div
          class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center h-14 px-2 gap-2"
        >
          <div class="col-start-1 justify-self-start flex items-center gap-1">
            <button
              id="hamburger-btn"
              class="h-10 shrink-0 aspect-[4/3] flex text-white/90 rounded-md items-center justify-center transition-colors"
              data-i18n-aria-label="main.menu"
              aria-expanded="false"
              aria-controls="sidebar-menu"
              aria-haspopup="dialog"
              data-i18n-title="main.menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="size-8"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
            ${this.onSubPage
              ? html`
                  <button
                    id="mobile-back-btn"
                    class="h-10 shrink-0 aspect-[4/3] flex text-white/90 rounded-md items-center justify-center transition-colors"
                    data-i18n-aria-label="main.back"
                    data-i18n-title="main.back"
                    @click=${() => this.goBack()}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-7"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M15.75 19.5 8.25 12l7.5-7.5"
                      />
                    </svg>
                  </button>
                `
              : ""}
          </div>

          <div
            class="col-start-2 flex items-center justify-center text-malibu-blue min-w-0"
          >
            <img
              src=${assetUrl("images/OpenBackLogo.svg")}
              alt="OpenBack"
              class="block h-7 max-w-[9rem] w-auto object-contain"
            />
          </div>

          ${crazyGamesSDK.isOnCrazyGames()
            ? html`
                <button
                  id="crazygames-account-btn"
                  data-page="page-account"
                  class="nav-menu-item col-start-3 justify-self-end h-10 shrink-0 flex items-center justify-center rounded-full overflow-hidden text-white/90 cursor-pointer"
                  data-i18n-aria-label="main.account"
                  data-i18n-title="main.account"
                >
                  <img
                    id="crazygames-account-avatar"
                    class="hidden w-8 h-8 rounded-full object-cover"
                    alt=""
                    referrerpolicy="no-referrer"
                  />
                  <svg
                    id="crazygames-account-icon"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                    class="w-7 h-7"
                  >
                    <path d="M20 21a8 8 0 0 0-16 0" />
                    <path d="M12 13a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
                  </svg>
                </button>
              `
            : html`
                <div
                  aria-hidden="true"
                  class="col-start-3 justify-self-end h-10 shrink-0 aspect-[4/3]"
                ></div>
              `}
        </div>
      </div>
    `;
  }
}
