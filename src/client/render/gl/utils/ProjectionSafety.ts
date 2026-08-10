/** True when every supplied projection component can safely reach WebGL. */
export function isFiniteClipGeometry(values: readonly number[]): boolean {
  for (const value of values) {
    if (!Number.isFinite(value)) return false;
  }
  return true;
}

/**
 * Keep world-space effects finite and bounded to the current map. This is a
 * rendering guard only; it never changes deterministic simulation damage.
 */
export function clampWorldRadius(
  radius: number,
  mapWidth: number,
  mapHeight: number,
): number {
  if (!Number.isFinite(radius) || radius <= 0) return 0;
  const maxRadius = Math.hypot(Math.max(0, mapWidth), Math.max(0, mapHeight));
  return Math.min(radius, maxRadius);
}
