/**
 * Device-pixel-ratio used by the WebGL renderer for its backing store and all
 * screen↔world math. Capped at 2 to avoid rendering at 3x on very high-DPI
 * (mobile) displays, which costs ~9x the fragment work of 1x for a marginal
 * visual gain over 2x.
 *
 * Every renderer call site that previously read `window.devicePixelRatio`
 * must go through this so the canvas size, camera math, and text scaling stay
 * on the same coordinate system.
 */
import { UserSettings } from "../../../../core/game/UserSettings";

export interface RenderDeviceProfile {
  devicePixelRatio: number;
  viewportWidth: number;
  hardwareConcurrency: number;
  deviceMemory?: number;
  coarsePointer: boolean;
}

export function renderDprForProfile(profile: RenderDeviceProfile): number {
  const dpr = profile.devicePixelRatio || 1;
  if (
    profile.viewportWidth <= 767 ||
    (profile.coarsePointer && profile.viewportWidth <= 1024)
  ) {
    const lowEnd =
      profile.hardwareConcurrency <= 4 ||
      (profile.deviceMemory !== undefined && profile.deviceMemory <= 4);
    return Math.min(dpr, lowEnd ? 1.25 : 1.5);
  }
  if (profile.viewportWidth <= 1023) {
    return Math.min(dpr, 1.75);
  }
  return Math.min(dpr, 2);
}

export function renderDpr(): number {
  const memory = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;
  return renderDprForProfile({
    devicePixelRatio: window.devicePixelRatio || 1,
    viewportWidth: window.innerWidth,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    deviceMemory: memory,
    coarsePointer:
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches,
  });
}

export function mobileRenderFrameIntervalMs(): number {
  // An explicit choice wins on every device. The browser still cannot exceed
  // the panel's refresh rate, so a cap above it just renders at the panel rate.
  const configured = new UserSettings().fpsLimit();
  if (configured > 0) return 1000 / configured;

  // "Auto": phones and tablets keep the historical 60 cap so a high-refresh
  // panel does not burn battery driving the map, desktop follows the display.
  const isTouchPhoneOrTablet =
    window.innerWidth <= 1024 &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  return isTouchPhoneOrTablet ? 1000 / 60 : 0;
}
