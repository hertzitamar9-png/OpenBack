import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import { translateText } from "../Utils";
import "./CapIcon";

@customElement("currency-display")
export class CurrencyDisplay extends LitElement {
  @property({ type: Number })
  soft: number = 0;

  createRenderRoot() {
    return this;
  }

  render() {
    const amount =
      this.soft >= Number.MAX_SAFE_INTEGER ? "∞" : this.soft.toLocaleString();
    return html`
      <div class="flex justify-center">
        <div
          class="flex items-center gap-1.5"
          title=${translateText("cosmetics.soft")}
        >
          <cap-icon .size=${20} style="margin-top:3px"></cap-icon>
          <span class="text-sm font-bold text-amber-700">${amount}</span>
        </div>
      </div>
    `;
  }
}
