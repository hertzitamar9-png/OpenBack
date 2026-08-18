import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { assetUrl } from "../../core/AssetUrls";

@customElement("page-footer")
export class Footer extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <footer
        class="[.in-game_&]:hidden bg-zinc-900/95 backdrop-blur-md flex flex-col items-center justify-center gap-1 py-2 lg:gap-1 lg:pt-1 lg:pb-3 text-white/50 w-full border-t border-white/10 shrink-0 relative z-30"
      >
        <div
          class="flex h-7 lg:h-auto items-center justify-center gap-6 lg:pt-2 w-full relative"
        >
          <a
            href="https://github.com/hertzitamar9-png/OpenBack"
            target="_blank"
            rel="noopener noreferrer"
            data-i18n-title="main.upstream_source"
            data-i18n-aria-label="main.upstream_source"
            class="hidden lg:block opacity-60 hover:opacity-100 hover:scale-110 transition-all"
          >
            <img
              src=${assetUrl("icons/github-mark-white.svg")}
              data-i18n-alt="main.github"
              class="h-6 w-6 lg:h-7 lg:w-7 object-contain pointer-events-none"
              draggable="false"
            />
          </a>
          <!-- Credits is the other half of the attribution pair the licences
               require, so it sits beside the repo link at matching weight. -->
          <a
            href="https://github.com/hertzitamar9-png/OpenBack/blob/main/CREDITS.md"
            target="_blank"
            rel="noopener noreferrer"
            data-i18n-title="main.credits"
            data-i18n-aria-label="main.credits"
            class="hidden lg:block opacity-60 hover:opacity-100 hover:scale-110 transition-all"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              class="h-6 w-6 lg:h-7 lg:w-7 object-contain pointer-events-none text-white"
            >
              <path
                d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.46-8 5.5V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-3.04-3.58-5.5-8-5.5Z"
              />
            </svg>
          </a>
          <lang-selector
            class="relative lg:absolute lg:right-4 lg:top-0"
          ></lang-selector>
        </div>
        <div
          class="w-full text-[10px] leading-4 lg:text-xs lg:mt-2 flex flex-wrap items-center justify-center gap-x-3 lg:gap-x-4 gap-y-1 lg:gap-y-2 px-3 lg:px-4"
        >
          <button
            type="button"
            class="nav-menu-item shrink-0 hover:text-white transition-colors cursor-pointer"
            data-page="page-tutorials"
            data-i18n="main.tutorials"
          ></button>
          <button
            type="button"
            class="nav-menu-item shrink-0 hover:text-white transition-colors cursor-pointer"
            data-page="page-blog"
            data-i18n="main.blog"
          ></button>
          <button
            type="button"
            class="nav-menu-item shrink-0 hover:text-white transition-colors cursor-pointer"
            data-page="page-terms"
            data-i18n="main.terms_of_service"
          ></button>
          <!-- Credits carry the upstream and asset attributions the licences
               require. Reachable from every page, not only while a game
               loads. -->
          <a
            href="https://github.com/hertzitamar9-png/OpenBack/blob/main/CREDITS.md"
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 hover:text-white transition-colors lg:hidden"
            data-i18n="main.credits"
          ></a>
          <button
            type="button"
            class="nav-menu-item shrink-0 hover:text-white transition-colors cursor-pointer"
            data-page="page-privacy"
            data-i18n="main.privacy_policy"
          ></button>
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=openback.dedyn.io%40gmail.com&su=OpenBack%20Service%20Request&body=Please%20describe%20your%20problem%20or%20question%2C%20what%20you%20expected%20to%20happen%2C%20and%20any%20details%20that%20may%20help%20us%20assist%20you.%0A%0ANever%20send%20your%20password%20or%20verification%20code."
            target="_blank"
            rel="noopener noreferrer"
            class="shrink-0 hover:text-white transition-colors"
            data-i18n="main.service_request"
          ></a>
        </div>
        <span
          class="block w-full px-3 text-left text-[9px] leading-tight text-white/40 sm:absolute sm:bottom-1 sm:left-3 sm:w-auto sm:px-0"
          data-i18n="main.copyright"
        ></span>
      </footer>
    `;
  }
}
