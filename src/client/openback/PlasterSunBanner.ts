import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translateText } from "../Utils";

/**
 * The bandaged sun shown to a player who keeps playing after the match is over.
 *
 * Lives in its own OpenBack component rather than inside upstream's WinModal so
 * that file carries a single tag instead of a block of OpenBack markup, and
 * upstream changes to the win screen keep merging cleanly.
 *
 * The sun here is the one the sky actually draws, wearing a plaster: same warm
 * core, same halo, same eight spokes, in the sky shader's own colours (disc
 * 1.0/0.97/0.86, halo 1.0/0.86/0.55, rays 1.0/0.90/0.62). A generic cartoon
 * sun read as a sticker from some other game; this reads as the sun that just
 * blew itself up, patched back together.
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
      <!-- A slim bar rather than a stacked block: it sits over the battlefield,
           so it stays one line high and gets out of the way. -->
      <div
        class="pointer-events-none fixed inset-x-0 top-16 z-[9000] flex justify-center px-3"
      >
        <div
          class="flex max-w-full items-center gap-2 rounded-full bg-black/70 py-1.5 pl-1.5 pr-4 shadow-lg backdrop-blur-sm"
        >
          <svg
            viewBox="0 0 120 120"
            class="h-9 w-9 shrink-0"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="ob-sun-halo" cx="50%" cy="50%" r="50%">
                <stop offset="45%" stop-color="#ffdb8c" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#ffdb8c" stop-opacity="0" />
              </radialGradient>
            </defs>
            <!-- The halo the sky paints around the disc. -->
            <circle cx="60" cy="60" r="58" fill="url(#ob-sun-halo)" />
            <!-- Eight spokes, as the shader's ray burst has. -->
            <g stroke="#ffe69e" stroke-width="6" stroke-linecap="round">
              <line x1="60" y1="10" x2="60" y2="25" />
              <line x1="60" y1="95" x2="60" y2="110" />
              <line x1="10" y1="60" x2="25" y2="60" />
              <line x1="95" y1="60" x2="110" y2="60" />
              <line x1="25" y1="25" x2="35" y2="35" />
              <line x1="85" y1="85" x2="95" y2="95" />
              <line x1="25" y1="95" x2="35" y2="85" />
              <line x1="85" y1="35" x2="95" y2="25" />
            </g>
            <circle cx="60" cy="60" r="30" fill="#fff7db" />
            <circle cx="60" cy="60" r="30" fill="#ffdb8c" opacity="0.45" />
            <!-- The plaster, and the scorch it is covering. -->
            <g transform="rotate(-28 60 60)">
              <rect
                x="30"
                y="50"
                width="60"
                height="20"
                rx="10"
                fill="#f3e2c7"
                stroke="#d9c3a1"
                stroke-width="2"
              />
              <rect
                x="50"
                y="52"
                width="20"
                height="16"
                rx="5"
                fill="#e7d2b0"
              />
            </g>
          </svg>
          <!-- One line, always: it shrinks to fit rather than wrapping into a
               block that buries the map underneath it. -->
          <p
            class="overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.62rem,2.1vw,1.05rem)] font-semibold text-white"
          >
            ${translateText("win_modal.sun_already_exploded")}
          </p>
        </div>
      </div>
    `;
  }
}
