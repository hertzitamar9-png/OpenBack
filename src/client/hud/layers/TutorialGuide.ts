import { html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import { UnitType } from "../../../core/game/Game";
import { Controller } from "../../Controller";
import {
  TUTORIAL_STEPS,
  TutorialProgress,
  TutorialStep,
} from "../../tutorial/TutorialScript";
import { GameView } from "../../view/GameView";

/** Set by the launcher so only a tutorial match shows the guide. */
export const TUTORIAL_FLAG = "openback.tutorial.active";

export function markTutorialMatch(): void {
  try {
    sessionStorage.setItem(TUTORIAL_FLAG, "1");
  } catch {
    // A private window without storage still gets a playable match; it just
    // will not be guided, which is better than refusing to start.
  }
}

export function isTutorialMatch(): boolean {
  try {
    return sessionStorage.getItem(TUTORIAL_FLAG) === "1";
  } catch {
    return false;
  }
}

export function clearTutorialMatch(): void {
  try {
    sessionStorage.removeItem(TUTORIAL_FLAG);
  } catch {
    /* nothing to clear */
  }
}

/** Just the parts of a DOMRect this decision needs. */
export interface Bounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
  height: number;
}

/**
 * Where the card should sit so the leaderboard does not cover it, or null to
 * leave it where the stylesheet puts it.
 *
 * The card is centred at the top of the screen, which is where the leaderboard
 * lives on a phone, so the two were drawn over each other. Measured rather
 * than nudged by a constant: the leaderboard grows with the number of players
 * and can be closed, so any fixed offset is wrong for most matches.
 */
export function cardTopAvoiding(
  card: Bounds,
  board: Bounds | undefined,
): number | null {
  if (board === undefined || board.height === 0) return null;
  // Only when they actually share horizontal space. On a wide screen the
  // leaderboard sits off to one side and the card can stay where it is.
  const sideBySide = board.right <= card.left || board.left >= card.right;
  if (sideBySide) return null;
  if (board.bottom <= card.top) return null;
  return Math.round(board.bottom + 8);
}

/**
 * The guide that runs alongside a tutorial match.
 *
 * It reads the real game every tick and advances only when the player has
 * actually done the thing being asked -- there is no timer moving it along, so
 * a player who wanders off comes back to the same instruction.
 *
 * Rendered into the light DOM so it can point at controls that live elsewhere
 * on the page: the pointer is positioned from getBoundingClientRect of whatever
 * the step names, which needs the two to share a coordinate space.
 */
@customElement("tutorial-guide")
export class TutorialGuide extends LitElement implements Controller {
  @state() private active = false;
  @state() private stepIndex = 0;
  @state() private pointer: { x: number; y: number; below: boolean } | null =
    null;
  @state() private celebrating = false;

  private game: GameView | null = null;
  private tilesAtStepStart = 0;
  private readonly everOwned = new Set<UnitType>();
  private repositionTimer: ReturnType<typeof setInterval> | null = null;

  createRenderRoot() {
    return this;
  }

  setGame(game: GameView): void {
    this.game = game;
  }

  init(): void {
    if (!isTutorialMatch()) return;
    this.active = true;
    this.stepIndex = 0;
    // The pointed-at control moves: the build bar relays out when the screen
    // rotates or Android slides its navigation over the page, and the bar
    // scrolls sideways. Re-measure rather than pin it once.
    this.repositionTimer = setInterval(() => this.placePointer(), 250);
    this.requestUpdate();
  }

  disconnectedCallback(): void {
    if (this.repositionTimer !== null) clearInterval(this.repositionTimer);
    this.repositionTimer = null;
    super.disconnectedCallback();
  }

  /** Watch what the player owns, including units that do not last. */
  private recordOwnedUnits(): void {
    const me = this.game?.myPlayer();
    if (!me) return;
    for (const unit of me.units()) this.everOwned.add(unit.type());
  }

  private progress(): TutorialProgress | null {
    const game = this.game;
    const me = game?.myPlayer();
    if (!game || !me) return null;
    return {
      spawning: game.inSpawnPhase(),
      tiles: me.numTilesOwned(),
      tilesAtStepStart: this.tilesAtStepStart,
      gold: me.gold(),
      outgoingAttacks: me.outgoingAttacks().length,
      alliances: me.alliances().length,
      everOwned: this.everOwned,
    };
  }

  tick(): void {
    if (!this.active || this.celebrating) return;
    this.recordOwnedUnits();
    const progress = this.progress();
    if (progress === null) return;

    const step = TUTORIAL_STEPS[this.stepIndex];
    if (step === undefined) return;

    // The first tick of a step records the tiles it started from, so a step
    // asking for "sixty more" means sixty more than when it was asked.
    if (this.tilesAtStepStart === 0 && progress.tiles > 0) {
      this.tilesAtStepStart = progress.tiles;
      return;
    }

    if (step.done(progress)) this.advance();
  }

  private advance(): void {
    if (this.stepIndex >= TUTORIAL_STEPS.length - 1) {
      this.celebrating = true;
      this.pointer = null;
      this.requestUpdate();
      return;
    }
    this.stepIndex += 1;
    this.tilesAtStepStart = this.game?.myPlayer()?.numTilesOwned() ?? 0;
    this.placePointer();
    this.requestUpdate();
  }

  private skipStep = () => {
    // A player who cannot manage a step should not be stuck behind it. The
    // match keeps running; only the instruction moves on.
    this.advance();
  };

  private endTutorial = () => {
    this.active = false;
    clearTutorialMatch();
    this.requestUpdate();
  };

  /**
   * Drop the card below the leaderboard when the two would overlap.
   *
   * The card is centred at the top, which is also where the leaderboard sits
   * on a phone, so the two were drawn on top of each other. Measured rather
   * than given a fixed offset: the leaderboard grows with the number of
   * players in it and can be collapsed, so any constant would be wrong for
   * most matches.
   */
  private avoidLeaderboard(): void {
    const card = this.querySelector<HTMLElement>(".tutorial-card");
    if (card === null) return;

    // Measure from the stylesheet's own position, which carries the safe-area
    // inset. Setting an inline top would otherwise become the thing we
    // measure next time, and the card would creep down the screen.
    card.style.removeProperty("top");
    const resting = card.getBoundingClientRect();
    const board = document
      .querySelector<HTMLElement>("leader-board")
      ?.getBoundingClientRect();

    const top = cardTopAvoiding(resting, board);
    if (top !== null) card.style.top = `${top}px`;
  }

  /** Put the pointer over whatever control the step names, if it is on screen. */
  private placePointer(): void {
    this.avoidLeaderboard();
    if (!this.active || this.celebrating) {
      if (this.pointer !== null) {
        this.pointer = null;
        this.requestUpdate();
      }
      return;
    }
    const step: TutorialStep | undefined = TUTORIAL_STEPS[this.stepIndex];
    const target = step?.target;
    if (!target) {
      if (this.pointer !== null) {
        this.pointer = null;
        this.requestUpdate();
      }
      return;
    }
    const el = document.querySelector(target.selector);
    const rect = el?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      if (this.pointer !== null) {
        this.pointer = null;
        this.requestUpdate();
      }
      return;
    }
    const next = {
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(target.place === "above" ? rect.top : rect.bottom),
      below: target.place === "below",
    };
    if (
      this.pointer?.x !== next.x ||
      this.pointer?.y !== next.y ||
      this.pointer?.below !== next.below
    ) {
      this.pointer = next;
      this.requestUpdate();
    }
  }

  private renderPointer(): TemplateResult | null {
    const p = this.pointer;
    if (p === null) return null;
    return html`
      <div
        class="tutorial-pointer"
        style=${`left:${p.x}px; top:${p.y}px; transform: translate(-50%, ${
          p.below ? "0" : "-100%"
        });`}
      >
        <div class="tutorial-pointer-ring"></div>
        <div class="tutorial-pointer-arrow">${p.below ? "▲" : "▼"}</div>
      </div>
    `;
  }

  render(): TemplateResult | null {
    if (!this.active) return null;

    if (this.celebrating) {
      return html`
        ${this.styles()}
        <div class="tutorial-card tutorial-card-done">
          <div class="tutorial-eyebrow">Training complete</div>
          <h2 class="tutorial-title">You know how to play</h2>
          <p class="tutorial-body">
            Cities and factories pay for everything, ports open the sea, defence
            posts hold a border and bombs clear one. Keep this match going as
            long as you like, or leave and start a real one.
          </p>
          <button class="tutorial-primary" @click=${this.endTutorial}>
            Keep playing
          </button>
        </div>
      `;
    }

    const step = TUTORIAL_STEPS[this.stepIndex];
    if (step === undefined) return null;

    return html`
      ${this.styles()} ${this.renderPointer()}
      <div class="tutorial-card">
        <div class="tutorial-eyebrow">
          Step ${this.stepIndex + 1} of ${TUTORIAL_STEPS.length}
        </div>
        <h2 class="tutorial-title">${step.title}</h2>
        <p class="tutorial-body">${step.body}</p>
        <div class="tutorial-actions">
          <button class="tutorial-ghost" @click=${this.skipStep}>
            Skip this step
          </button>
          <button class="tutorial-ghost" @click=${this.endTutorial}>
            End tutorial
          </button>
        </div>
        <div class="tutorial-track">
          <div
            class="tutorial-fill"
            style=${`width:${((this.stepIndex + 1) / TUTORIAL_STEPS.length) * 100}%`}
          ></div>
        </div>
      </div>
    `;
  }

  private styles(): TemplateResult {
    return html`
      <style>
        /* Anchored to the top so it never covers the build bar the steps keep
           asking the player to press. */
        .tutorial-card {
          position: fixed;
          left: 50%;
          transform: translateX(-50%);
          top: calc(env(safe-area-inset-top) + 4.5rem);
          z-index: 90;
          width: min(30rem, calc(100vw - 1.5rem));
          padding: 0.85rem 1rem 0.9rem;
          border-radius: 0.9rem;
          background: rgb(9 22 39 / 0.95);
          border: 1px solid rgb(56 189 248 / 0.35);
          box-shadow: 0 10px 30px rgb(0 0 0 / 0.45);
          color: #e8eef8;
          pointer-events: auto;
        }
        .tutorial-eyebrow {
          font-size: 0.65rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgb(125 211 252);
          font-weight: 700;
        }
        .tutorial-title {
          margin: 0.15rem 0 0.35rem;
          font-size: 1.05rem;
          line-height: 1.25;
          font-weight: 800;
          text-wrap: balance;
        }
        .tutorial-body {
          margin: 0;
          font-size: 0.82rem;
          line-height: 1.45;
          color: rgb(203 213 225);
        }
        .tutorial-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.6rem;
        }
        .tutorial-ghost,
        .tutorial-primary {
          font: inherit;
          cursor: pointer;
          border-radius: 0.5rem;
          padding: 0.35rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .tutorial-ghost {
          background: transparent;
          border: 1px solid rgb(255 255 255 / 0.18);
          color: rgb(203 213 225);
        }
        .tutorial-ghost:hover {
          color: #fff;
          border-color: rgb(255 255 255 / 0.35);
        }
        .tutorial-primary {
          background: rgb(14 165 233);
          border: 0;
          color: #fff;
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
          margin-top: 0.7rem;
        }
        .tutorial-track {
          margin-top: 0.7rem;
          height: 3px;
          border-radius: 999px;
          background: rgb(255 255 255 / 0.12);
          overflow: hidden;
        }
        .tutorial-fill {
          height: 100%;
          background: rgb(56 189 248);
          transition: width 240ms ease-out;
        }

        /* The pointer sits over the control the step names and pulses, so the
           instruction has somewhere to point rather than describing a button
           the player has to hunt for. */
        .tutorial-pointer {
          position: fixed;
          z-index: 95;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .tutorial-pointer-ring {
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 999px;
          border: 2px solid rgb(56 189 248);
          animation: tutorial-pulse 1.4s ease-out infinite;
        }
        .tutorial-pointer-arrow {
          color: rgb(56 189 248);
          font-size: 0.9rem;
          line-height: 1;
          animation: tutorial-nudge 1.4s ease-in-out infinite;
        }
        @keyframes tutorial-pulse {
          0% {
            transform: scale(0.72);
            opacity: 0.95;
          }
          70% {
            transform: scale(1.25);
            opacity: 0.12;
          }
          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }
        @keyframes tutorial-nudge {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(3px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tutorial-pointer-ring,
          .tutorial-pointer-arrow {
            animation: none;
          }
        }
      </style>
    `;
  }
}
