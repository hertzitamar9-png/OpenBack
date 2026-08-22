/**
 * The win-time sun detonation.
 *
 * Kept as a tiny shared value rather than an event: the win modal is a Lit
 * component and the renderer is a WebGL pass with no event bus between them,
 * so the modal raises the flag and the renderer samples it each frame.
 */

/** Seconds the sun spends swelling before it lets go. */
const CHARGE_SECONDS = 1.6;
/** Seconds the blast takes to throw itself across the sky and burn out. */
const BURST_SECONDS = 2.8;
const TOTAL_SECONDS = CHARGE_SECONDS + BURST_SECONDS;

/** Where the charge ends and the detonation begins, as a fraction of the whole. */
export const SUN_BLAST_DETONATION = CHARGE_SECONDS / TOTAL_SECONDS;

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
 * How far through the detonation we are, 0 when nothing is happening.
 *
 * This used to be a strength that rose and then fell back, which the sky read
 * as the sun swelling and quietly deflating -- never as an explosion. It is
 * now a one-way progress through the whole sequence, so the shader can charge,
 * detonate, and throw a shockwave outward in the right order instead of
 * running the same curve backwards.
 *
 * Never returns exactly 0 while running, since 0 is what "idle" means.
 */
export function sunBlastAmount(now: number = performance.now()): number {
  if (startedAt === null) return 0;
  const elapsed = (now - startedAt) / 1000;
  if (elapsed < 0) return 0;
  if (elapsed >= TOTAL_SECONDS) {
    startedAt = null;
    return 0;
  }
  return Math.max(0.001, elapsed / TOTAL_SECONDS);
}
