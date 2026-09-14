import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { keyed } from "lit/directives/keyed.js";
import { Cell } from "../../../core/game/Game";
import {
  isTutorialConfig,
  MISSION_STAGES,
  MissionSnapshot,
} from "../../../core/tutorial/Mission";
import { TUTORIAL_POINTS } from "../../../core/tutorial/TutorialTerrain";
import { appRouter } from "../../AppRouter";
import { Controller } from "../../Controller";
import { TransformHandler } from "../../TransformHandler";
import { translateText } from "../../Utils";
import { GameView } from "../../view/GameView";
import "./TutorialGuide.css";

export const TUTORIAL_FLAG = "openback.tutorial.active";
export function markTutorialMatch(): void {
  try {
    sessionStorage.setItem(TUTORIAL_FLAG, "1");
  } catch {
    /* storage is optional */
  }
}
export function clearTutorialMatch(): void {
  try {
    sessionStorage.removeItem(TUTORIAL_FLAG);
  } catch {
    /* storage is optional */
  }
}
export function isTutorialMatch(): boolean {
  try {
    return sessionStorage.getItem(TUTORIAL_FLAG) === "1";
  } catch {
    return false;
  }
}
export interface Bounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
  height: number;
}
export function cardTopAvoiding(
  card: Bounds,
  board: Bounds | undefined,
): number | null {
  if (
    !board?.height ||
    board.right <= card.left ||
    board.left >= card.right ||
    board.bottom <= card.top
  )
    return null;
  return Math.round(board.bottom + 8);
}
const text = (key: string, params?: Record<string, string | number>) =>
  translateText(`first_command.${key}`, params);
const visible = (selector: string): HTMLElement | undefined =>
  Array.from(document.querySelectorAll<HTMLElement>(selector)).find((el) => {
    const r = el.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      r.left >= 0 &&
      r.right <= window.innerWidth &&
      r.top >= 0 &&
      r.bottom <= window.innerHeight
    );
  });

@customElement("tutorial-guide")
export class TutorialGuide extends LitElement implements Controller {
  @state() private active = false;
  @state() private expanded = true;
  @state() private mission: MissionSnapshot | null = null;
  private game: GameView | null = null;
  private transform: TransformHandler | null = null;
  private abort?: AbortController;
  private frame = 0;
  private lastPhase = -1;
  private highlight: HTMLElement | null = null;
  private lastSelector = "";
  private nextMeasure = 0;
  createRenderRoot() {
    return this;
  }
  setGame(game: GameView, transform?: TransformHandler): void {
    this.game = game;
    this.transform = transform ?? null;
  }
  init(): void {
    this.dispose();
    if (!this.game || !isTutorialConfig(this.game.config().gameConfig()))
      return;
    this.active = true;
    this.expanded = true;
    this.lastPhase = -1;
    this.mission = null;
    document.body.classList.add("first-command-active");
    this.abort = new AbortController();
    document.addEventListener("input", this.onRatioInput, {
      signal: this.abort.signal,
    });
    this.frame = requestAnimationFrame(this.positionMarkers);
  }
  dispose(): void {
    this.abort?.abort();
    this.abort = undefined;
    cancelAnimationFrame(this.frame);
    this.highlight?.classList.remove("mission-control-highlight");
    this.highlight = null;
    this.lastSelector = "";
    this.active = false;
    document
      .querySelectorAll(".mission-equipment-locked")
      .forEach((el) => el.classList.remove("mission-equipment-locked"));
    document.body.classList.remove("first-command-active");
  }
  disconnectedCallback(): void {
    this.dispose();
    super.disconnectedCallback();
  }
  tick(): void {
    if (!this.active || !this.game?.tutorial) return;
    const next = this.game.tutorial;
    if (next.phase !== this.lastPhase) {
      this.lastPhase = next.phase;
      this.expanded = true;
      this.mission = next;
      this.updateComplete.then(() => {
        if (!this.active) return;
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
          this.focusObjective();
        if (next.phase === 2) {
          const slider = visible('input[data-tutorial="troop-ratio"]') as
            | HTMLInputElement
            | undefined;
          if (slider)
            this.game?.worker.tutorialCommand({
              phase: 2,
              action: "ratio",
              value: Number(slider.value),
            });
        }
      });
    }
    // One-second readout updates; markers follow the camera without Lit renders.
    if (
      !this.mission ||
      Math.floor(next.phaseTicks / 10) !==
        Math.floor(this.mission.phaseTicks / 10) ||
      next.objectiveMet !== this.mission.objectiveMet ||
      next.completed !== this.mission.completed ||
      next.skipped !== this.mission.skipped ||
      next.recovered !== this.mission.recovered ||
      next.cue !== this.mission.cue
    )
      this.mission = next;
  }
  private onRatioInput = (event: Event): void => {
    if (
      !(event.target instanceof HTMLInputElement) ||
      !event.target.matches('input[data-tutorial="troop-ratio"]') ||
      this.mission?.phase !== 2
    )
      return;
    this.game?.worker.tutorialCommand({
      phase: 2,
      action: "ratio",
      value: Number(event.target.value),
    });
  };
  private focusObjective = (): void => {
    const point =
      TUTORIAL_POINTS[MISSION_STAGES[this.mission?.phase ?? 0].point];
    const phone = window.innerWidth < 700;
    const zoom = phone ? 1.25 : 1.8;
    let screenOffsetY = 0;
    if (phone) {
      const panel =
        this.querySelector(".mission-panel")?.getBoundingClientRect();
      const controls = document
        .querySelector(".game-hud-controls")
        ?.getBoundingClientRect();
      const clearBottom = controls?.height
        ? controls.top - 45
        : innerHeight - 60;
      const clearTop = (panel?.bottom ?? 0) + 45;
      const targetY = Math.min(
        clearBottom,
        Math.max(innerHeight / 2, clearTop),
      );
      screenOffsetY = targetY - innerHeight / 2;
    }
    // On a short phone the geometric center is inside the briefing. Frame
    // the real map target in the available playfield so it remains tappable.
    this.transform?.focusMission(point.x, point.y - screenOffsetY / zoom, zoom);
  };
  private skip = (): void => {
    const mission = this.game?.tutorial;
    if (!mission) return;
    this.game!.worker.tutorialCommand({ phase: mission.phase, action: "skip" });
    this.mission = { ...mission, skipped: true };
  };
  private recover = (): void => {
    if (this.mission)
      this.game?.worker.tutorialCommand({
        phase: this.mission.phase,
        action: "recover",
      });
  };
  private exit = (): void => {
    void appRouter.navigatePage("page-play", true);
  };
  private practice = (): void => {
    clearTutorialMatch();
    this.dispose();
  };
  private positionMarkers = (now: number): void => {
    if (!this.active) return;
    const stage = MISSION_STAGES[this.mission?.phase ?? 0];
    const point = TUTORIAL_POINTS[stage.point];
    const location = this.transform?.worldToScreenCoordinates(
      new Cell(point.x, point.y),
    );
    const marker = this.querySelector<HTMLElement>(".mission-world-marker");
    if (marker && location) {
      marker.style.transform = `translate3d(${location.x}px,${location.y}px,0)`;
      marker.hidden =
        location.x < 20 ||
        location.x > innerWidth - 20 ||
        location.y < 60 ||
        location.y > innerHeight - 90;
    }
    const route = this.querySelector<SVGPathElement>(".mission-route path");
    if (route && this.transform) {
      const a = this.transform.worldToScreenCoordinates(
        new Cell(TUTORIAL_POINTS.harbor.x, TUTORIAL_POINTS.harbor.y),
      );
      const b = this.transform.worldToScreenCoordinates(
        new Cell(TUTORIAL_POINTS.landing.x, TUTORIAL_POINTS.landing.y),
      );
      route.setAttribute(
        "d",
        `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - 45} ${b.x} ${b.y}`,
      );
    }
    if (now >= this.nextMeasure) {
      this.nextMeasure = now + 200;
      const finished =
        this.mission?.skipped === true || this.mission?.completed === true;
      const selector = finished
        ? ""
        : (stage.selector ??
          (stage.unit ? `[data-build-unit="${stage.unit}"]` : ""));
      const unlocked = new Set(
        MISSION_STAGES.slice(0, (this.mission?.phase ?? 0) + 1).flatMap((s) =>
          s.unit ? [s.unit as string] : [],
        ),
      );
      document
        .querySelectorAll<HTMLElement>("[data-build-unit]")
        .forEach((el) => {
          el.classList.toggle(
            "mission-equipment-locked",
            !finished && !unlocked.has(el.dataset.buildUnit ?? ""),
          );
        });
      if (selector !== this.lastSelector) {
        this.highlight?.classList.remove("mission-control-highlight");
        this.highlight = null;
        this.lastSelector = selector;
      }
      const target = selector ? visible(selector) : undefined;
      if (target !== this.highlight) {
        this.highlight?.classList.remove("mission-control-highlight");
        this.highlight = target ?? null;
        this.highlight?.classList.add("mission-control-highlight");
      }
    }
    this.frame = requestAnimationFrame(this.positionMarkers);
  };
  render() {
    if (!this.active) return null;
    const m = this.mission,
      phase = m?.phase ?? 0,
      stage = MISSION_STAGES[phase];
    const finished = m?.completed === true || m?.skipped === true;
    const seconds = Math.max(
      0,
      Math.ceil((stage.minimumTicks - (m?.phaseTicks ?? 0)) / 10),
    );
    const elapsed = Math.floor((m?.elapsedTicks ?? 0) / 10);
    const cue =
      m?.cue && m.cue !== "briefing"
        ? text(m.cue === "resupplied" ? "supply_notice" : m.cue)
        : null;
    return html` ${!finished
        ? keyed(
            `cinematic-${phase}`,
            html`<aside class="mission-chapter-cinematic" aria-hidden="true">
              <small
                >${text("chapter", {
                  current: phase + 1,
                  total: MISSION_STAGES.length,
                })}</small
              ><strong>${text(`${stage.id}_title`)}</strong><i></i>
            </aside>`,
          )
        : null}
      ${!finished && phase >= 9 && phase <= 10
        ? html`<svg class="mission-route" aria-hidden="true">
            <path fill="none" />
          </svg>`
        : null}
      ${!finished
        ? html`<div class="mission-world-marker" aria-hidden="true">
            <div class="mission-beacon"></div>
            <span
              >${text("map_label")} ${String(phase + 1).padStart(2, "0")}</span
            >
          </div>`
        : null}
      <section
        class="mission-panel tutorial-card"
        aria-label=${text("name")}
        data-mission-phase=${stage.id}
        data-mission-completed=${m?.completed ?? false}
      >
        <header class="mission-masthead">
          <span class="mission-insignia" aria-hidden="true">◈</span>
          <div>
            <small>${text("eyebrow")}</small><strong>${text("name")}</strong>
          </div>
          <time
            >${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(
              2,
              "0",
            )}</time
          >
        </header>
        ${finished
          ? html`<div class="mission-finale">
              <small>${text(m.completed ? "completed" : "skipped")}</small>
              <h2>${text(m.completed ? "completed" : "skipped")}</h2>
              <p>${text(m.completed ? "summary" : "skipped_body")}</p>
              <button @click=${this.practice}>${text("practice")}</button
              ><button @click=${this.exit}>${text("exit")}</button>
            </div>`
          : html`
              <div class="mission-chapter-row">
                <span
                  >${text("chapter", {
                    current: phase + 1,
                    total: MISSION_STAGES.length,
                  })}</span
                ><button
                  class="mission-toggle"
                  aria-expanded=${this.expanded}
                  @click=${() => {
                    this.expanded = !this.expanded;
                  }}
                >
                  ${text(this.expanded ? "collapse" : "briefing")}
                  ${this.expanded ? "−" : "+"}
                </button>
              </div>
              ${keyed(
                phase,
                html`<div class="mission-chapter">
                  <h2>${text(`${stage.id}_title`)}</h2>
                  <div class="mission-details" ?hidden=${!this.expanded}>
                    <p>${text(`${stage.id}_body`)}</p>
                    <p class="mission-tip">${text(`${stage.id}_hint`)}</p>
                  </div>
                </div>`,
              )}
              <div class="mission-status" role="status">
                <span
                  class=${m?.objectiveMet
                    ? "mission-check done"
                    : "mission-check"}
                  >${m?.objectiveMet ? "✓" : "○"}</span
                ><span>${text(m?.objectiveMet ? "verified" : "action")}</span
                >${seconds > 0
                  ? html`<small>${text("window", { seconds })}</small>`
                  : null}
              </div>
              ${cue && this.expanded
                ? html`<aside class="mission-radio">${cue}</aside>`
                : null}
              <div class="mission-actions">
                <button class="mission-focus" @click=${this.focusObjective}>
                  ⌖ ${text("focus")}</button
                ><button @click=${this.recover}>${text("supplies")}</button>
              </div>
              <footer class="mission-footer">
                <button @click=${this.skip}>${text("skip")}</button
                ><button @click=${this.exit}>${text("exit")}</button>
              </footer>
              ${this.expanded
                ? html`<small class="mission-equipment-note"
                    >${text("locked")}</small
                  >`
                : null}
              <div
                class="mission-progress"
                role="progressbar"
                aria-valuenow=${phase}
                aria-valuemin="0"
                aria-valuemax=${MISSION_STAGES.length}
                aria-label=${text("name")}
              >
                <i
                  style=${`width:${(phase / MISSION_STAGES.length) * 100}%`}
                ></i>
              </div>
            `}
      </section>`;
  }
}
