import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../Utils";

export const PLAYER_TUTORIAL_STORAGE_KEY =
  "openback.player-tutorial.onboarding.v1";

type TutorialScreen = "closed" | "prompt" | "choose" | "steps";
type TutorialMode = "2d" | "3d";

type TutorialStep = {
  titleKey: string;
  bodyKey: string;
  icon: string;
};

const TUTORIAL_STEPS: Record<TutorialMode, TutorialStep[]> = {
  "2d": [
    {
      titleKey: "player_tutorial.2d_step_1_title",
      bodyKey: "player_tutorial.2d_step_1_body",
      icon: "◎",
    },
    {
      titleKey: "player_tutorial.2d_step_2_title",
      bodyKey: "player_tutorial.2d_step_2_body",
      icon: "↗",
    },
    {
      titleKey: "player_tutorial.2d_step_3_title",
      bodyKey: "player_tutorial.2d_step_3_body",
      icon: "%",
    },
    {
      titleKey: "player_tutorial.2d_step_4_title",
      bodyKey: "player_tutorial.2d_step_4_body",
      icon: "▦",
    },
    {
      titleKey: "player_tutorial.2d_step_5_title",
      bodyKey: "player_tutorial.2d_step_5_body",
      icon: "★",
    },
  ],
  "3d": [
    {
      titleKey: "player_tutorial.3d_step_1_title",
      bodyKey: "player_tutorial.3d_step_1_body",
      icon: "◉",
    },
    {
      titleKey: "player_tutorial.3d_step_2_title",
      bodyKey: "player_tutorial.3d_step_2_body",
      icon: "⌖",
    },
    {
      titleKey: "player_tutorial.3d_step_3_title",
      bodyKey: "player_tutorial.3d_step_3_body",
      icon: "△",
    },
    {
      titleKey: "player_tutorial.3d_step_4_title",
      bodyKey: "player_tutorial.3d_step_4_body",
      icon: "⚔",
    },
    {
      titleKey: "player_tutorial.3d_step_5_title",
      bodyKey: "player_tutorial.3d_step_5_body",
      icon: "★",
    },
  ],
};

@customElement("player-tutorial")
export class PlayerTutorial extends LitElement {
  @state() private screen: TutorialScreen = "closed";
  @state() private mode: TutorialMode | null = null;
  @state() private stepIndex = 0;

  createRenderRoot() {
    return this;
  }

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("open-player-tutorial", this.openTutorial);
    if (!this.hasCompletedOnboarding()) {
      this.screen = "prompt";
      document.body.classList.add("tutorial-coach-active");
    }
  }

  disconnectedCallback(): void {
    document.removeEventListener("open-player-tutorial", this.openTutorial);
    document.body.classList.remove("tutorial-coach-active");
    super.disconnectedCallback();
  }

  private hasCompletedOnboarding(): boolean {
    try {
      return localStorage.getItem(PLAYER_TUTORIAL_STORAGE_KEY) === "complete";
    } catch {
      return false;
    }
  }

  private markComplete(): void {
    try {
      localStorage.setItem(PLAYER_TUTORIAL_STORAGE_KEY, "complete");
    } catch {
      // Storage can be unavailable in strict privacy modes. The tutorial still
      // closes normally; it may be offered again on the next visit.
    }
    document.body.classList.remove("tutorial-coach-active");
  }

  private openTutorial = (): void => {
    this.mode = null;
    this.stepIndex = 0;
    this.screen = "choose";
    document.body.classList.remove("tutorial-coach-active");
  };

  private startTutorial = (): void => {
    this.screen = "choose";
    document.body.classList.remove("tutorial-coach-active");
  };

  private skipTutorial = (): void => {
    this.markComplete();
    this.screen = "closed";
  };

  private selectMode(mode: TutorialMode): void {
    this.mode = mode;
    this.stepIndex = 0;
    this.screen = "steps";
  }

  private finishTutorial = (): void => {
    this.markComplete();
    this.screen = "closed";
  };

  private previousStep = (): void => {
    this.stepIndex = Math.max(0, this.stepIndex - 1);
  };

  private nextStep = (): void => {
    if (!this.mode) return;
    this.stepIndex = Math.min(
      TUTORIAL_STEPS[this.mode].length - 1,
      this.stepIndex + 1,
    );
  };

  private renderPrompt() {
    return html`
      <section
        data-tutorial-dialog
        data-tutorial-first-run
        class="tutorial-panel tutorial-coach-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-first-title"
      >
        <div class="tutorial-up-arrow" aria-hidden="true">↑</div>
        <span class="tutorial-eyebrow"
          >${translateText("player_tutorial.first_visit")}</span
        >
        <h1 id="tutorial-first-title">
          ${translateText("player_tutorial.first_title")}
        </h1>
        <p>${translateText("player_tutorial.first_body")}</p>
        <div class="tutorial-actions tutorial-actions-stack-mobile">
          <button
            type="button"
            data-tutorial-skip
            class="tutorial-button tutorial-button-secondary"
            @click=${this.skipTutorial}
          >
            ${translateText("player_tutorial.skip")}
          </button>
          <button
            type="button"
            data-tutorial-start
            class="tutorial-button tutorial-button-primary"
            @click=${this.startTutorial}
          >
            ${translateText("player_tutorial.open")}
          </button>
        </div>
      </section>
    `;
  }

  private renderModeChoice() {
    return html`
      <section
        data-tutorial-dialog
        class="tutorial-panel tutorial-wide-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-mode-title"
      >
        <header class="tutorial-header">
          <div>
            <span class="tutorial-eyebrow"
              >${translateText("player_tutorial.eyebrow")}</span
            >
            <h1 id="tutorial-mode-title">
              ${translateText("player_tutorial.choose_title")}
            </h1>
            <p>${translateText("player_tutorial.choose_body")}</p>
          </div>
          <button
            type="button"
            data-tutorial-skip
            class="tutorial-skip-link"
            @click=${this.skipTutorial}
          >
            ${translateText("player_tutorial.skip")}
          </button>
        </header>
        <div class="tutorial-mode-grid">
          <button
            type="button"
            data-tutorial-mode="2d"
            class="tutorial-mode-card tutorial-mode-2d"
            @click=${() => this.selectMode("2d")}
          >
            <span class="tutorial-mode-art" aria-hidden="true">
              <i></i><i></i><i></i><i></i>
            </span>
            <strong>${translateText("player_tutorial.mode_2d")}</strong>
            <small>${translateText("player_tutorial.2d_description")}</small>
          </button>
          <button
            type="button"
            data-tutorial-mode="3d"
            class="tutorial-mode-card tutorial-mode-3d"
            @click=${() => this.selectMode("3d")}
          >
            <span class="tutorial-mode-art" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <strong>${translateText("player_tutorial.mode_3d")}</strong>
            <small>${translateText("player_tutorial.3d_description")}</small>
          </button>
        </div>
      </section>
    `;
  }

  private renderSteps() {
    if (!this.mode) return html``;
    const steps = TUTORIAL_STEPS[this.mode];
    const step = steps[this.stepIndex];
    const isLast = this.stepIndex === steps.length - 1;
    return html`
      <section
        data-tutorial-dialog
        data-tutorial-step
        class="tutorial-panel tutorial-step-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-step-title"
      >
        <header class="tutorial-step-header">
          <button
            type="button"
            class="tutorial-back-link"
            @click=${() => {
              this.mode = null;
              this.screen = "choose";
            }}
          >
            ← ${translateText("player_tutorial.change_mode")}
          </button>
          <button
            type="button"
            data-tutorial-skip
            class="tutorial-skip-link"
            @click=${this.skipTutorial}
          >
            ${translateText("player_tutorial.skip")}
          </button>
        </header>
        <div class="tutorial-step-visual tutorial-step-${this.mode}">
          <span aria-hidden="true">${step.icon}</span>
          <div class="tutorial-visual-grid" aria-hidden="true"></div>
        </div>
        <div class="tutorial-step-copy">
          <span data-tutorial-progress class="tutorial-progress">
            ${this.stepIndex + 1} / ${steps.length}
          </span>
          <span class="tutorial-mode-label">
            ${this.mode === "2d"
              ? translateText("player_tutorial.mode_2d")
              : translateText("player_tutorial.mode_3d")}
          </span>
          <h1 id="tutorial-step-title">${translateText(step.titleKey)}</h1>
          <p>${translateText(step.bodyKey)}</p>
        </div>
        <footer class="tutorial-actions">
          ${this.stepIndex > 0
            ? html`<button
                type="button"
                data-tutorial-previous
                class="tutorial-button tutorial-button-secondary"
                @click=${this.previousStep}
              >
                ${translateText("player_tutorial.previous")}
              </button>`
            : html`<span></span>`}
          ${isLast
            ? html`<button
                type="button"
                data-tutorial-finish
                class="tutorial-button tutorial-button-primary"
                @click=${this.finishTutorial}
              >
                ${translateText("player_tutorial.finish")}
              </button>`
            : html`<button
                type="button"
                data-tutorial-next
                class="tutorial-button tutorial-button-primary"
                @click=${this.nextStep}
              >
                ${translateText("player_tutorial.next")}
              </button>`}
        </footer>
      </section>
    `;
  }

  render() {
    if (this.screen === "closed") return html``;
    return html`
      <style>
        body.tutorial-coach-active [data-tutorial-entry] {
          outline: 3px solid #38bdf8;
          outline-offset: 5px;
          animation: tutorial-entry-pulse 1.4s ease-in-out infinite;
        }
        @keyframes tutorial-entry-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgb(56 189 248 / 0.55);
          }
          50% {
            box-shadow: 0 0 0 10px rgb(56 189 248 / 0);
          }
        }
        .tutorial-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: max(1rem, env(safe-area-inset-top)) 1rem
            max(1rem, env(safe-area-inset-bottom));
          background: rgb(0 5 15 / 0.82);
          backdrop-filter: blur(8px);
          color: white;
        }
        .tutorial-panel {
          width: min(100%, 42rem);
          max-height: min(88dvh, 48rem);
          overflow-y: auto;
          border: 1px solid rgb(56 189 248 / 0.35);
          border-radius: 1.25rem;
          padding: clamp(1.25rem, 3vw, 2rem);
          background: linear-gradient(
            145deg,
            rgb(15 32 51 / 0.98),
            rgb(4 12 25 / 0.99)
          );
          box-shadow:
            0 24px 80px rgb(0 0 0 / 0.6),
            0 0 45px rgb(14 165 233 / 0.12);
        }
        .tutorial-wide-panel {
          width: min(100%, 58rem);
        }
        .tutorial-panel h1 {
          margin: 0.35rem 0 0;
          font-size: clamp(1.65rem, 4vw, 2.45rem);
          line-height: 1.08;
          font-weight: 900;
        }
        .tutorial-panel p {
          margin: 0.9rem 0 0;
          color: rgb(203 213 225);
          font-size: 1rem;
          line-height: 1.65;
        }
        .tutorial-eyebrow,
        .tutorial-mode-label {
          color: #38bdf8;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .tutorial-header,
        .tutorial-step-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .tutorial-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        .tutorial-button {
          min-height: 3rem;
          border: 0;
          border-radius: 0.75rem;
          padding: 0.75rem 1.25rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          transition:
            transform 160ms ease,
            filter 160ms ease;
        }
        .tutorial-button:hover {
          transform: translateY(-1px);
          filter: brightness(1.08);
        }
        .tutorial-button-primary {
          background: #0ea5e9;
          color: white;
        }
        .tutorial-button-secondary {
          background: rgb(255 255 255 / 0.08);
          color: white;
          border: 1px solid rgb(255 255 255 / 0.14);
        }
        .tutorial-skip-link,
        .tutorial-back-link {
          border: 0;
          background: transparent;
          color: rgb(203 213 225);
          padding: 0.5rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .tutorial-skip-link:hover,
        .tutorial-back-link:hover {
          color: white;
        }
        .tutorial-coach-panel {
          position: relative;
          text-align: center;
        }
        .tutorial-up-arrow {
          color: #38bdf8;
          font-size: 3rem;
          line-height: 1;
          margin-bottom: 0.5rem;
          animation: tutorial-arrow 1.1s ease-in-out infinite;
        }
        .tutorial-mode-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .tutorial-mode-card {
          min-height: 19rem;
          display: grid;
          grid-template-rows: minmax(10rem, 1fr) auto auto;
          align-items: flex-start;
          gap: 0.5rem;
          overflow: hidden;
          position: relative;
          border: 1px solid rgb(255 255 255 / 0.13);
          border-radius: 1rem;
          padding: 1.25rem;
          color: white;
          text-align: left;
          background: rgb(15 23 42);
          transition:
            transform 180ms ease,
            border-color 180ms ease;
        }
        .tutorial-mode-card:hover {
          transform: translateY(-3px);
          border-color: #38bdf8;
        }
        .tutorial-mode-card strong {
          position: relative;
          z-index: 2;
          font-size: 1.35rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .tutorial-mode-card small {
          position: relative;
          z-index: 2;
          color: rgb(203 213 225);
          line-height: 1.45;
        }
        .tutorial-mode-art {
          position: relative;
          width: calc(100% + 2.5rem);
          min-height: 10rem;
          margin: -1.25rem -1.25rem 0.5rem;
          overflow: hidden;
          background: linear-gradient(180deg, #164e63, #0f172a);
        }
        .tutorial-mode-2d .tutorial-mode-art {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.35rem;
          padding: 1rem;
          transform: rotate(-4deg) scale(1.08);
        }
        .tutorial-mode-2d .tutorial-mode-art i {
          border-radius: 40% 60% 55% 45%;
          background: linear-gradient(135deg, #a3e635, #0ea5e9);
          opacity: 0.9;
        }
        .tutorial-mode-3d .tutorial-mode-art {
          perspective: 300px;
        }
        .tutorial-mode-3d .tutorial-mode-art i {
          position: absolute;
          left: 16%;
          right: 16%;
          height: 36%;
          transform: rotateX(55deg) rotateZ(-8deg);
          border: 2px solid rgb(125 211 252 / 0.7);
          background: linear-gradient(135deg, #365314, #0284c7);
          clip-path: polygon(50% 0, 100% 25%, 82% 100%, 15% 85%, 0 20%);
        }
        .tutorial-mode-3d .tutorial-mode-art i:nth-child(1) {
          top: 12%;
        }
        .tutorial-mode-3d .tutorial-mode-art i:nth-child(2) {
          top: 27%;
          filter: brightness(0.8);
        }
        .tutorial-mode-3d .tutorial-mode-art i:nth-child(3) {
          top: 42%;
          filter: brightness(0.6);
        }
        .tutorial-step-visual {
          position: relative;
          height: clamp(10rem, 28vh, 15rem);
          display: grid;
          place-items: center;
          overflow: hidden;
          margin: 1rem 0;
          border-radius: 1rem;
          background:
            radial-gradient(
              circle at 50% 45%,
              rgb(14 165 233 / 0.35),
              transparent 48%
            ),
            linear-gradient(150deg, #172554, #020617);
        }
        .tutorial-step-visual > span {
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
          width: 5.5rem;
          height: 5.5rem;
          border: 2px solid rgb(125 211 252 / 0.8);
          border-radius: 50%;
          background: rgb(2 8 23 / 0.78);
          color: #7dd3fc;
          font-size: 2.2rem;
          font-weight: 900;
          box-shadow: 0 0 30px rgb(14 165 233 / 0.35);
        }
        .tutorial-visual-grid {
          position: absolute;
          inset: 0;
          opacity: 0.25;
          background-image:
            linear-gradient(rgb(125 211 252 / 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgb(125 211 252 / 0.35) 1px, transparent 1px);
          background-size: 2rem 2rem;
          transform: ${this.mode === "3d"
            ? "perspective(250px) rotateX(58deg) scale(1.5)"
            : "none"};
        }
        .tutorial-progress {
          display: inline-flex;
          margin-right: 0.65rem;
          border-radius: 999px;
          padding: 0.25rem 0.65rem;
          background: rgb(14 165 233 / 0.18);
          color: #7dd3fc;
          font-size: 0.75rem;
          font-weight: 900;
        }
        @keyframes tutorial-arrow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-7px);
          }
        }
        @media (max-width: 640px) {
          .tutorial-mode-grid {
            grid-template-columns: 1fr;
          }
          .tutorial-mode-card {
            min-height: 11.5rem;
            grid-template-rows: 5.5rem auto auto;
            padding: 1rem;
          }
          .tutorial-mode-art {
            width: calc(100% + 2rem);
            min-height: 5.5rem;
            margin: -1rem -1rem 0.25rem;
          }
          .tutorial-header {
            flex-direction: column;
          }
          .tutorial-skip-link {
            align-self: flex-end;
          }
          .tutorial-actions-stack-mobile {
            flex-direction: column-reverse;
          }
          .tutorial-actions-stack-mobile .tutorial-button {
            width: 100%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          body.tutorial-coach-active [data-tutorial-entry],
          .tutorial-up-arrow {
            animation: none;
          }
          .tutorial-button,
          .tutorial-mode-card {
            transition: none;
          }
        }
      </style>
      <div data-tutorial-overlay class="tutorial-overlay">
        ${this.screen === "prompt"
          ? this.renderPrompt()
          : this.screen === "choose"
            ? this.renderModeChoice()
            : this.renderSteps()}
      </div>
    `;
  }
}
