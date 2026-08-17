import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import "./CosmeticBackground";

@customElement("play-page")
export class PlayPage extends LitElement {
  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <div
        id="page-play"
        class="flex flex-col gap-2 w-full px-0 lg:px-4 min-h-0"
      >
        <token-login class="absolute"></token-login>
        <rewards-modal class="absolute"></rewards-modal>

        <!-- Identity strip. News and external promotions stay out of the play
             screen so the controls remain stable and quick to load. -->
        <div
          class="w-full pb-4 lg:pb-0 flex flex-col gap-4 sm:-mx-4 sm:w-[calc(100%+2rem)] lg:mx-0 lg:w-full"
        >
          <!-- Mobile: spacer for fixed top bar -->
          <div
            class="lg:hidden h-[calc(env(safe-area-inset-top)+56px)] -mb-4"
          ></div>

          <!-- Announcements stay on the News page so gameplay controls never
               move when a new warning or release notice arrives. -->
          <div class="flex flex-col min-w-0">
            <!-- Identity row: flag + tag/username + skin in one line. Flag sits before the
                 tag (where it shows in-game), skin at the end; both preview the current
                 selection. Replaces the old separate SELECT SKIN / SELECT FLAG buttons. -->
            <div
              class="relative bg-surface border-y border-white/10 overflow-visible flex items-center sm:min-h-[60px] sm:flex-1 sm:z-20 sm:border-y-0 sm:rounded-xl"
            >
              <!-- Selected skin/pattern fills the bubble like the player's territory in
                   game (the skin button updates it), shown as a frame around the controls. -->
              <cosmetic-background
                class="absolute inset-0 z-0 overflow-hidden sm:rounded-xl pointer-events-none"
              ></cosmetic-background>
              <!-- Controls share one surface bubble so it reads as a single clean bar
                   (buttons blend at rest and only highlight on hover). -->
              <div
                class="relative z-10 flex h-full w-full min-w-0 items-center gap-2 bg-surface/80 p-1 sm:rounded-xl"
              >
                <flag-input
                  show-select-label
                  class="shrink-0 h-11 w-11 sm:h-full sm:w-auto sm:max-h-[52px] aspect-square"
                ></flag-input>
                <username-input
                  class="flex-1 min-w-0 h-10 sm:h-[50px]"
                ></username-input>
                <cosmetics-input
                  id="cosmetics-input-mobile"
                  show-select-label
                  class="no-crazygames shrink-0 h-11 w-11 sm:h-full sm:w-auto sm:max-h-[52px] aspect-square"
                ></cosmetics-input>
              </div>
            </div>
          </div>
        </div>

        <game-mode-selector></game-mode-selector>
      </div>
    `;
  }
}
