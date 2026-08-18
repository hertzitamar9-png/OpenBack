/**
 * Shows the updating screen to pages that are already open.
 *
 * Caddy serves the updating page to anyone who *requests* it during a deploy,
 * but a tab that is already loaded never asks for the HTML again, so players
 * sitting in the game saw nothing at all: the server swapped underneath them.
 * This watches the same deploy-status feed from the client and puts the same
 * screen up, then reloads onto the new build once the window closes.
 */

/**
 * How often to check. The status file is static and served by Caddy, so this
 * can be brisk: every client should raise the screen within a second or two of
 * each other, and the countdown itself is derived from the server's own start
 * time so the minute stays in step for everyone regardless.
 */
const POLL_MS = 2000;
/** Tighter polling once an update is in progress, so the reload lands promptly. */
const ACTIVE_POLL_MS = 1000;

interface DeployStatus {
  state?: string;
  phase?: string;
  eta?: number;
  startedAt?: number;
}

let overlay: HTMLElement | null = null;
let sawUpdating = false;
let updating = false;

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
    <div style="font-size:1.35rem;font-weight:600">Updating the game…</div>
    <div style="color:#8aa0c0;font-size:.95rem;max-width:32rem;line-height:1.5">
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

function paint(status: DeployStatus): void {
  const el = ensureOverlay();
  // The deploy holds the window open for a fixed minute, so the bar and the
  // countdown share that budget and stay in step with the served page.
  const budget = Math.max(status.eta && status.eta > 0 ? status.eta : 0, 60);
  const elapsed = Date.now() / 1000 - (status.startedAt ?? 0);
  const left = Math.max(0, Math.ceil(budget - elapsed));
  const fill = el.querySelector<HTMLElement>("#openback-update-fill");
  const eta = el.querySelector<HTMLElement>("#openback-update-eta");
  if (fill) {
    fill.style.width = `${Math.min(elapsed / budget, 1) * 94}%`;
  }
  if (eta) {
    eta.textContent = left > 0 ? `${left}s left` : "almost done…";
  }
}

async function poll(): Promise<void> {
  let delay = POLL_MS;
  try {
    const response = await fetch("/api/deploy-status", { cache: "no-store" });
    if (response.ok) {
      const status = (await response.json()) as DeployStatus;
      if (status.state === "updating") {
        sawUpdating = true;
        updating = true;
        paint(status);
        delay = ACTIVE_POLL_MS;
      } else if (sawUpdating) {
        updating = false;
        // The window closed: come back on the new build.
        window.location.reload();
        return;
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
export function startUpdateWatcher(): void {
  if (typeof window === "undefined" || typeof fetch !== "function") return;
  // Check straight away so a player loading during a window sees it at once.
  void poll();
}
