import type { ExperienceMode } from "../core/Schemas";

const STORAGE_KEY = "openback-experience";

export function experienceFromRoute(
  target: { experienceMode?: ExperienceMode },
  fallback: ExperienceMode,
): ExperienceMode {
  return target.experienceMode ?? fallback;
}

function storedMode(): ExperienceMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "3d" ? "3d" : "2d";
  } catch {
    return "2d";
  }
}

class ExperienceContext {
  private mode: ExperienceMode = storedMode();

  get(): ExperienceMode {
    return this.mode;
  }

  select(mode: ExperienceMode, source: "route" | "user"): void {
    if (source === "user") {
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Storage can be disabled; the in-memory selection still works.
      }
    }
    if (this.mode === mode) return;
    this.mode = mode;
    window.dispatchEvent(
      new CustomEvent("experience-changed", { detail: { mode, source } }),
    );
  }
}

export const experienceContext = new ExperienceContext();
