import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { ExperienceMode } from "../../core/Schemas";

@customElement("experience-switch")
export class ExperienceSwitch extends LitElement {
  @property({ type: String }) mode: ExperienceMode = "2d";

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <section
        class="experience-switch grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-[#07111f]/90 p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.34)]"
        aria-label="Select OpenBack world"
      >
        ${this.option("2d", "CLASSIC 2D", "Fast strategic command")}
        ${this.option("3d", "IMMERSIVE 3D", "Raised world and free camera")}
      </section>
    `;
  }

  private option(mode: ExperienceMode, title: string, subtitle: string) {
    const selected = this.mode === mode;
    return html`
      <button
        type="button"
        data-experience=${mode}
        aria-pressed=${selected ? "true" : "false"}
        class="group min-h-14 rounded-xl border px-3 py-2 text-left transition-all sm:px-5 ${selected
          ? "border-sky-300/70 bg-sky-500/20 shadow-[0_0_22px_rgba(30,169,255,0.22)]"
          : "border-transparent bg-white/[0.035] hover:border-white/15 hover:bg-white/[0.07]"}"
        @click=${() => this.select(mode)}
      >
        <span
          class="block text-xs font-black tracking-[0.14em] sm:text-sm ${selected
            ? "text-sky-200"
            : "text-white/72 group-hover:text-white"}"
          >${title}</span
        >
        <span class="mt-0.5 block text-[10px] text-white/45 sm:text-xs"
          >${subtitle}</span
        >
      </button>
    `;
  }

  private select(mode: ExperienceMode): void {
    if (mode === this.mode) return;
    this.dispatchEvent(
      new CustomEvent("experience-select", {
        detail: { mode },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
