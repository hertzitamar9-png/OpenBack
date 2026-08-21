/**
 * Shows the updating screen to pages that are already open.
 *
 * Caddy serves the updating page to anyone who *requests* it during a deploy,
 * but a tab that is already loaded never asks for the HTML again, so players
 * sitting in the game saw nothing at all: the server swapped underneath them.
 * This watches the same deploy-status feed from the client and puts the same
 * screen up, then reloads onto the new build once the window closes.
 */

import { EventBus, GameEvent } from "../../core/EventBus";

/**
 * How often to check. The status file is static and served by Caddy, so this
 * can be brisk: every client should raise the screen within a second or two of
 * each other, and the countdown itself is derived from the server's own start
 * time so the minute stays in step for everyone regardless.
 */
const POLL_MS = 2000;
/** Tighter polling once an update is in progress, so the reload lands promptly. */
const ACTIVE_POLL_MS = 1000;
/** The legacy visual estimate; readiness, never elapsed time, ends an update. */
const WINDOW_SECONDS = 60;
/** How often the screen redraws itself, independent of the network. */
const TICK_MS = 250;
const RESUME_SECONDS = 5;

export class UpdateSuspensionEvent implements GameEvent {
  constructor(public readonly suspended: boolean) {}
}

interface DeployStatus {
  state?: string;
  phase?: string;
  eta?: number;
  startedAt?: number;
}

let overlay: HTMLElement | null = null;
let sawUpdating = false;
let updating = false;
/**
 * The window's start, latched the moment we first see it. The feed stops
 * reporting a start time once the window closes, and a failed deploy can leave
 * the feed unreachable entirely, so the countdown has to survive on its own.
 */
let windowStart = 0;
let clock: number | null = null;
let reloading = false;
let reloadAfterMatch = false;
let eventBus: EventBus | null = null;
let suspensionEmitted = false;
let resumeClock: number | null = null;
let resumeRemaining = RESUME_SECONDS;

/** True while an update window is open. */
export function isUpdating(): boolean {
  return updating;
}

function ensureOverlay(): HTMLElement {
  if (overlay) return overlay;
  const el = document.createElement("div");
  el.id = "openback-update-overlay";
  el.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:2147483646",
    "display:flex",
    "flex-direction:column",
    "align-items:center",
    "justify-content:center",
    "gap:18px",
    "background:#0a1424",
    "color:#e8eef8",
    "font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
    "padding:24px",
    "text-align:center",
  ].join(";");
  el.innerHTML = `
    <div id="openback-update-check"
         style="width:46px;height:46px;border-radius:999px;display:none;
                align-items:center;justify-content:center;background:#16a34a;
                box-shadow:0 0 22px rgba(34,197,94,.55)">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#ffffff"
           stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <path d="M4 12.5 9.5 18 20 6.5" />
      </svg>
    </div>
    <div id="openback-update-title" style="font-size:1.35rem;font-weight:600">Updating the game…</div>
    <div id="openback-update-note"
         style="color:#8aa0c0;font-size:.95rem;max-width:32rem;line-height:1.5">
      A new version is being installed. This page will reload automatically when it's ready.
    </div>
    <div style="width:min(460px,100%);height:12px;border-radius:999px;background:#16233a;
                overflow:hidden;box-shadow:inset 0 0 0 1px #22314d">
      <div id="openback-update-fill"
           style="height:100%;width:0%;border-radius:999px;transition:width .45s ease;
                  background:linear-gradient(90deg,#0ea5e9,#4fd1ff);
                  box-shadow:0 0 16px rgba(14,165,233,.55)"></div>
    </div>
    <div id="openback-update-eta"
         style="font-size:.8rem;color:#8aa0c0;text-transform:uppercase;letter-spacing:.08em">
      starting
    </div>`;
  document.body.appendChild(el);
  overlay = el;
  return el;
}

function elapsed(): number {
  return Date.now() / 1000 - windowStart;
}

/**
 * Whether the player is in a match right now. Main toggles this class on the
 * body when a game starts and ends, and the HUD already keys its own layout
 * off it, so it is the same signal the rest of the client trusts.
 */
function inGame(): boolean {
  return document.body.classList.contains("in-game");
}

function paintUpdating(): void {
  const el = ensureOverlay();
  const seconds = elapsed();
  const left = Math.max(0, Math.ceil(WINDOW_SECONDS - seconds));

  const fill = el.querySelector<HTMLElement>("#openback-update-fill");
  const eta = el.querySelector<HTMLElement>("#openback-update-eta");
  const title = el.querySelector<HTMLElement>("#openback-update-title");
  const note = el.querySelector<HTMLElement>("#openback-update-note");

  const check = el.querySelector<HTMLElement>("#openback-update-check");
  if (fill) {
    const progress = Math.min(seconds / WINDOW_SECONDS, 0.95);
    fill.style.width = `${progress * 100}%`;
    fill.style.background = "linear-gradient(90deg,#0ea5e9,#4fd1ff)";
    fill.style.boxShadow = "0 0 16px rgba(14,165,233,.55)";
  }
  if (check) check.style.display = "none";
  if (title) title.textContent = "Updating the game…";
  if (note) {
    note.textContent = inGame()
      ? "A new version is being installed. Your game is paused until it's ready."
      : "A new version is being installed. This page will reload automatically when it's ready.";
  }
  if (eta) {
    eta.textContent = left > 0 ? `${left}s left` : "finishing update";
  }
}

function paintResume(): void {
  const el = ensureOverlay();
  const fill = el.querySelector<HTMLElement>("#openback-update-fill");
  const eta = el.querySelector<HTMLElement>("#openback-update-eta");
  const title = el.querySelector<HTMLElement>("#openback-update-title");
  const note = el.querySelector<HTMLElement>("#openback-update-note");
  const check = el.querySelector<HTMLElement>("#openback-update-check");
  if (fill) {
    fill.style.width = "100%";
    fill.style.background = "linear-gradient(90deg,#16a34a,#4ade80)";
    fill.style.boxShadow = "0 0 16px rgba(34,197,94,.6)";
  }
  if (check) check.style.display = "flex";
  if (title) title.textContent = "Update complete";
  if (note) note.textContent = inGame() ? "Resuming in" : "Reloading in";
  if (eta) {
    eta.textContent = String(resumeRemaining);
    eta.style.fontSize = "2rem";
    eta.style.color = "#e8eef8";
  }
}

/**
 * Drives the screen from the latched start time rather than from the feed, so
 * the minute runs to completion — and never past it — whether the deploy
 * finished early, is still grinding, or fell over and took the feed with it.
 */
function tick(): void {
  paintUpdating();
}

function startClock(startedAt: number): void {
  if (windowStart === 0) {
    // Trust the server's start time so every client shares one minute; fall
    // back to now if the feed omitted it.
    windowStart = startedAt > 0 ? startedAt : Date.now() / 1000;
  }
  clock ??= window.setInterval(tick, TICK_MS);
  tick();
}

function setSuspended(suspended: boolean): void {
  if (suspensionEmitted === suspended) return;
  suspensionEmitted = suspended;
  eventBus?.emit(new UpdateSuspensionEvent(suspended));
}

function finishResume(): void {
  if (resumeClock !== null) {
    window.clearInterval(resumeClock);
    resumeClock = null;
  }
  updating = false;
  if (inGame()) {
    setSuspended(false);
    reloadAfterMatch = true;
    overlay?.remove();
    overlay = null;
    return;
  }
  reloading = true;
  window.location.reload();
}

function beginResumeCountdown(): void {
  if (resumeClock !== null || reloading || reloadAfterMatch) return;
  if (clock !== null) {
    window.clearInterval(clock);
    clock = null;
  }
  resumeRemaining = RESUME_SECONDS;
  paintResume();
  resumeClock = window.setInterval(() => {
    resumeRemaining--;
    if (resumeRemaining <= 0) {
      finishResume();
      return;
    }
    paintResume();
  }, 1000);
}

async function poll(): Promise<void> {
  let delay = POLL_MS;
  if (reloadAfterMatch) {
    if (!inGame() && !reloading) {
      reloading = true;
      window.location.reload();
      return;
    }
    window.setTimeout(() => void poll(), ACTIVE_POLL_MS);
    return;
  }
  try {
    const response = await fetch("/api/deploy-status", { cache: "no-store" });
    if (response.ok) {
      const status = (await response.json()) as DeployStatus;
      if (status.state === "updating") {
        sawUpdating = true;
        updating = true;
        startClock(status.startedAt ?? 0);
        if (inGame()) setSuspended(true);
        delay = ACTIVE_POLL_MS;
      } else if (sawUpdating) {
        beginResumeCountdown();
        delay = ACTIVE_POLL_MS;
      }
    }
  } catch {
    // Server mid-swap. Keep the screen up and try again shortly.
    if (sawUpdating) {
      updating = true;
      delay = ACTIVE_POLL_MS;
    }
  }
  window.setTimeout(() => void poll(), delay);
}

/** Begin watching. Safe to call once at start-up. */
export function startUpdateWatcher(updateEventBus?: EventBus): void {
  if (typeof window === "undefined" || typeof fetch !== "function") return;
  eventBus = updateEventBus ?? null;
  // Check straight away so a player loading during a window sees it at once.
  void poll();
}
