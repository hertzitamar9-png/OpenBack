/**
 * Which way each unit is facing, remembered between the ticks it moves on.
 *
 * Both unit renderers derive a heading from the step a unit just took, and
 * both had the same flaw: on a tick with no step they fell back to zero, due
 * north. Units move a tile at a time, so most ticks have no step and the
 * artwork snapped back to facing up between them. Worse, the two renderers
 * each had their own copy of the calculation, so fixing one left 3D models
 * (which is what ships are drawn as) still spinning to north.
 *
 * Headings are also turned toward gradually. A tile step only ever yields one
 * of eight directions, so a route change would otherwise snap the artwork
 * through 45 or 90 degrees in a single frame.
 */

/**
 * Most a unit may rotate in one tick, in radians. At ten ticks a second this
 * comes about ninety degrees in just under half a second.
 */
export const MAX_TURN_PER_TICK = 0.35;

/**
 * Rotate `current` toward `target` by at most `maxStep`, the short way round.
 *
 * Angles wrap, so the naive difference sends a unit crossing north the long
 * way about -- a full spin in place to change heading by a few degrees.
 */
export function turnToward(
  current: number,
  target: number,
  maxStep: number,
): number {
  const twoPi = Math.PI * 2;
  let delta = (target - current) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

export class HeadingTracker {
  private readonly headings = new Map<number, number>();
  private readonly seen = new Set<number>();

  /** Call before walking the units for a frame. */
  beginFrame(): void {
    this.seen.clear();
  }

  /**
   * The angle to draw `id` at.
   *
   * `target` is null when the unit produced no heading this tick, in which
   * case it holds the one it had. `advance` is false when the same simulation
   * tick is being re-rendered, so a fast display cannot spin units faster.
   */
  track(id: number, target: number | null, advance: boolean): number {
    this.seen.add(id);
    const current = this.headings.get(id);
    if (current === undefined) {
      // Nothing pointing it yet: start facing wherever it is going, or north
      // for something that has never moved at all.
      const start = target ?? 0;
      this.headings.set(id, start);
      return start;
    }
    if (target === null || !advance) return current;

    const next = turnToward(current, target, MAX_TURN_PER_TICK);
    this.headings.set(id, next);
    return next;
  }

  /**
   * Call after the frame. Units that died or left view must not keep their
   * heading, or a recycled id inherits it and the map grows all match.
   */
  endFrame(): void {
    if (this.headings.size === this.seen.size) return;
    for (const id of this.headings.keys()) {
      if (!this.seen.has(id)) this.headings.delete(id);
    }
  }
}
