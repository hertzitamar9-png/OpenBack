/**
 * The win-time sun detonation.
 *
 * Kept as a tiny shared value rather than an event: the win modal is a Lit
 * component and the renderer is a WebGL pass with no event bus between them,
 * so the modal raises the flag and the renderer samples it each frame.
 */

/** Seconds the sun takes to swell before it lets go. */
const RISE_SECONDS = 1.6;
/** Seconds the blanched sky takes to fade back out. */
const FADE_SECONDS = 2.4;

let startedAt: number | null = null;

/** Begin the detonation. Safe to call more than once; the last call wins. */
export function triggerSunBlast(): void {
  startedAt = performance.now();
}

/** Cancel an in-flight detonation, e.g. when a new game starts. */
export function clearSunBlast(): void {
  startedAt = null;
}

/**
 * Current blast strength, 0..1.
 *
 * Rises to full while the sun swells, then decays. Returns 0 once finished so
 * the sky returns to its normal daylight look.
 */
export function sunBlastAmount(now: number = performance.now()): number {
  if (startedAt === null) return 0;
  const elapsed = (now - startedAt) / 1000;
  if (elapsed < 0) return 0;
  if (elapsed < RISE_SECONDS) return elapsed / RISE_SECONDS;
  const fading = (elapsed - RISE_SECONDS) / FADE_SECONDS;
  if (fading >= 1) {
    startedAt = null;
    return 0;
  }
  return 1 - fading;
}
