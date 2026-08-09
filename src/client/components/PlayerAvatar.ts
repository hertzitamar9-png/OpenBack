import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { assetUrl } from "../../core/AssetUrls";

@customElement("player-avatar")
export class PlayerAvatar extends LitElement {
  @property() src?: string;
  @property() label = "OpenBack player";
  @property() size = "2rem";

  createRenderRoot() {
    return this;
  }

  render() {
    const fallback = assetUrl("images/OpenBackMark512.png");
    return html`
      <img
        src=${this.src ?? fallback}
        alt=${this.label}
        width="32"
        height="32"
        style=${`width:${this.size};height:${this.size}`}
        class="block shrink-0 rounded-full object-cover"
        @error=${(event: Event) => {
          const image = event.currentTarget as HTMLImageElement;
          if (!image.src.endsWith(fallback)) image.src = fallback;
        }}
      />
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "player-avatar": PlayerAvatar;
  }
}
