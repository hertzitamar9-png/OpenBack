import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { appRouter } from "../AppRouter";
import { crazyGamesSDK } from "../CrazyGamesSDK";
import { toggleMobileSidebar } from "../Navigation";
import "./NavAccountMenu";
import "./NavUtilityIcons";
import { openBackHomeWordmark } from "./ui/OpenBackWordmark";

/**
 * The mobile top bar (menu button, logo, account).
 *
 * This lives outside `play-page` on purpose. It used to be rendered inside it,
 * so switching to any other tab hid `page-play` and took the menu button with
 * it, leaving no way to reach the menu from News, Clans, Settings and so on.
 *
 * The back button appears only on sub-pages and steps out one level at a time:
 * from a page showing a single tutorial it returns to the tutorial list, and
 * only from a page's own top level does it return to Play. It does that by
 * driving the page's existing header back button, so each page keeps the one
 * definition of its own hierarchy. Pages without a modal header can instead
 * claim the press by cancelling the `openback-back` event.
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
    // Act on the page actually on screen rather than on `currentPageId`, which
    // a page can leave stale when it closes or redirects itself. Otherwise the
    // press is aimed at the wrong page and skips a level.
    const page =
      document.querySelector<HTMLElement>(".page-content:not(.hidden)") ??
      document.getElementById(window.currentPageId ?? "page-play");
    const pageId = page?.id ?? window.currentPageId ?? "page-play";

    // Reuse the page's own header back button. Every modal already encodes its
    // hierarchy there (an open article returns to the article list, a clan
    // sub-view returns to the clan, and the top level closes), so driving that
    // button keeps one definition of "one level out" instead of a second copy
    // here that would drift.
    const innerBack =
      page?.querySelector<HTMLButtonElement>("[data-modal-back]");
    if (innerBack) {
      innerBack.click();
      // If that press closed the page rather than stepping inside it, put the
      // navigation state back on Play so the tabs agree with what is shown.
      requestAnimationFrame(() => {
        if (!page || page.classList.contains("hidden")) {
          void appRouter.navigatePage("page-play");
        }
      });
      return;
    }

    // Pages without a modal header can still claim the press themselves.
    const handled = !window.dispatchEvent(
      new CustomEvent("openback-back", {
        detail: pageId,
        cancelable: true,
      }),
    );
    if (!handled) void appRouter.navigatePage("page-play");
  }

  render() {
    return html`
      <div
        class="lg:hidden fixed left-0 right-0 top-0 z-[60] pt-[env(safe-area-inset-top)] bg-surface border-b border-white/10"
      >
        <div
          class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center h-14 px-2 gap-2"
        >
          <div class="col-start-1 justify-self-start flex items-center gap-1">
            <button
              id="hamburger-btn"
              class="h-11 shrink-0 aspect-[4/3] flex text-white/90 rounded-md items-center justify-center transition-colors"
              data-i18n-aria-label="main.menu"
              aria-expanded="false"
              aria-controls="sidebar-menu"
              aria-haspopup="dialog"
              data-i18n-title="main.menu"
              @click=${(event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                toggleMobileSidebar();
              }}
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
                    class="h-11 shrink-0 aspect-[4/3] flex text-white/90 rounded-md items-center justify-center transition-colors"
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
            ${openBackHomeWordmark({
              wrapperClass: "block h-7 max-w-[9rem]",
              imageClass: "block h-full max-w-full w-auto object-contain",
            })}
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
                  class="col-start-3 justify-self-end flex items-center min-w-0"
                >
                  <nav-utility-icons size="mobile"></nav-utility-icons>
                  <nav-account-menu variant="mobile"></nav-account-menu>
                </div>
              `}
        </div>
      </div>
    `;
  }
}
