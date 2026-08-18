import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translateText } from "../Utils";

/**
 * The bandaged sun shown to a player who keeps playing after the match is over.
 *
 * Lives in its own OpenBack component rather than inside upstream's WinModal so
 * that file carries a single tag instead of a block of OpenBack markup, and
 * upstream changes to the win screen keep merging cleanly.
 */
@customElement("openback-plaster-sun")
export class PlasterSunBanner extends LitElement {
  /** Shown only once the player chose to stay. */
  @property({ type: Boolean }) visible = false;

  createRenderRoot() {
    return this;
  }

  render() {
    if (!this.visible) return null;
    return html`
      <div
        class="pointer-events-none fixed inset-x-0 top-16 z-[9000] flex flex-col items-center gap-3 px-4"
      >
        <svg viewBox="0 0 120 120" class="h-24 w-24 drop-shadow-lg">
          <g stroke="#f6c453" stroke-width="7" stroke-linecap="round">
            <line x1="60" y1="8" x2="60" y2="24" />
            <line x1="60" y1="96" x2="60" y2="112" />
            <line x1="8" y1="60" x2="24" y2="60" />
            <line x1="96" y1="60" x2="112" y2="60" />
            <line x1="23" y1="23" x2="34" y2="34" />
            <line x1="86" y1="86" x2="97" y2="97" />
            <line x1="23" y1="97" x2="34" y2="86" />
            <line x1="86" y1="34" x2="97" y2="23" />
          </g>
          <circle cx="60" cy="60" r="30" fill="#ffd764" />
          <!-- the plaster -->
          <g transform="rotate(-28 60 58)">
            <rect
              x="34"
              y="49"
              width="52"
              height="18"
              rx="9"
              fill="#f3e2c7"
              stroke="#d9c3a1"
              stroke-width="2"
            />
            <rect x="52" y="51" width="16" height="14" rx="4" fill="#e7d2b0" />
          </g>
          <circle cx="49" cy="72" r="2.6" fill="#8a6a1f" />
          <circle cx="71" cy="72" r="2.6" fill="#8a6a1f" />
        </svg>
        <p
          class="max-w-3xl rounded-2xl bg-black/70 px-5 py-3 text-center text-xl font-semibold leading-snug text-white sm:text-2xl"
        >
          ${translateText("win_modal.sun_already_exploded")}
        </p>
      </div>
    `;
  }
}
