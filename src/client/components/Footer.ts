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
        class="[.in-game_&]:hidden bg-zinc-900/90 backdrop-blur-md flex flex-col items-center justify-center gap-1 pt-1 pb-3 text-white/50 w-full border-t border-white/10 shrink-0 relative z-50"
      >
        <div
          class="flex items-center justify-center gap-4 lg:gap-6 pt-2 w-full relative"
        >
          <a
            href="https://github.com/hertzitamar9-png/OpenBack"
            target="_blank"
            rel="noopener noreferrer"
            data-i18n-title="main.upstream_source"
            data-i18n-aria-label="main.upstream_source"
            class="opacity-60 hover:opacity-100 hover:scale-110 transition-all"
          >
            <img
              src=${assetUrl("icons/github-mark-white.svg")}
              data-i18n-alt="main.github"
              class="h-6 w-6 lg:h-7 lg:w-7 object-contain pointer-events-none"
              draggable="false"
            />
          </a>
          <lang-selector
            class="absolute right-4 top-0 sm:top-[10px]"
          ></lang-selector>
        </div>
        <div
          class="text-xs mt-1 lg:mt-2 flex items-center justify-center gap-4 px-4"
        >
          <button
            type="button"
            class="nav-menu-item hover:text-white transition-colors cursor-pointer"
            data-page="page-tutorials"
          >
            Tutorials
          </button>
          <button
            type="button"
            class="nav-menu-item hover:text-white transition-colors cursor-pointer"
            data-page="page-blog"
          >
            Blog
          </button>
          <button
            type="button"
            class="nav-menu-item hover:text-white transition-colors cursor-pointer"
            data-page="page-terms"
            data-i18n="main.terms_of_service"
          ></button>
          <span data-i18n="main.copyright"></span>
          <button
            type="button"
            class="nav-menu-item hover:text-white transition-colors cursor-pointer"
            data-page="page-privacy"
            data-i18n="main.privacy_policy"
          ></button>
        </div>
      </footer>
    `;
  }
}
