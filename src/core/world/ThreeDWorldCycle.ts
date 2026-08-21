export interface ThreeDWorldCycleState {
  phase: number;
  daylight: number;
  isNight: boolean;
  tideHeight: number;
  waveStrength: number;
  currentX: number;
  currentY: number;
}

/**
 * Length of one full day/night cycle, in ticks.
 *
 * The simulation runs at 10 ticks per second, so 6000 ticks is ten minutes:
 * five of day and five of night, split exactly in half by the sun being above
 * or below the horizon.
 */
export const CYCLE_TICKS = 6000;

/**
 * Visible crest height in 3D world units at full wave strength.
 *
 * Sized against the terrain it sits beside rather than by eye. Land height is
 * `(0.15 + (m/30)^2 * 31) * 1.5`, so a magnitude-10 hill stands about 5.4 units
 * and a magnitude-30 peak about 46. At the old 0.62 the tallest crest reached
 * roughly 0.74 units - real geometry, but around 1.5% of a mountain, which is
 * why the sea read as a flat sheet no matter how the waves moved.
 *
 * At 4.0 the heaviest night crests reach about 8 units, so the biggest waves
 * stand taller than a magnitude-10 hill (5.4). Matching the 46-unit polar
 * peaks was asked for but is not playable: the sea would sit above nearly all
 * land and the map would read as submerged.
 */
export const THREE_D_WAVE_HEIGHT_SCALE = 4.0;

/** Highest terrain magnitude the night tide can cover. */
export const TIDAL_MAX_MAGNITUDE = 2;

/**
 * How far inland the tide reaches, in tiles, beyond the shoreline itself.
 *
 * Seeding only from ocean-facing tiles floods a single-tile ribbon: on the
 * world map that is 94% of the coast but still under 4% of the land, so the
 * sea visibly rose and then stopped dead at the first row of terrain. Letting
 * it climb a few tiles inland over low ground is what makes a night tide read
 * as the water taking ground.
 */
export const TIDAL_REACH_TILES = 3;

/** Low, ocean-facing land that the 3D night tide may cover temporarily. */
export function isTidalCoast(
  terrainByte: number,
  touchesOcean: boolean,
): boolean {
  const isLand = (terrainByte & 0x80) !== 0;
  const magnitude = terrainByte & 0x1f;
  return isLand && touchesOcean && magnitude <= TIDAL_MAX_MAGNITUDE;
}

/**
 * Low land the tide may climb onto once the water has already reached it.
 *
 * Identical to `isTidalCoast` except it does not require the tile to touch the
 * ocean, because inland tiles are reached through already-flooded neighbours.
 */
export function isFloodableLand(terrainByte: number): boolean {
  const isLand = (terrainByte & 0x80) !== 0;
  const magnitude = terrainByte & 0x1f;
  return isLand && magnitude <= TIDAL_MAX_MAGNITUDE;
}

/** Pure authoritative clock shared by simulation, replays, and rendering. */
export function threeDWorldCycle(tick: number): ThreeDWorldCycleState {
  const phase =
    (((tick % CYCLE_TICKS) + CYCLE_TICKS) % CYCLE_TICKS) / CYCLE_TICKS;
  const solar = Math.cos(phase * Math.PI * 2);
  const daylight = Math.max(0.12, Math.min(1, 0.56 + solar * 0.44));
  // Exactly half the cycle. Thresholding the daylight curve instead would
  // make night the narrower part of a cosine -- about 37% of the cycle -- so
  // the sun's own position is what divides them.
  const isNight = solar < 0;
  const lunarTide = 0.18 + (1 - daylight) * 0.54;
  const waveStrength = 0.72 + (1 - daylight) * 0.48;
  const currentAngle =
    phase * Math.PI * 2 + Math.sin(phase * Math.PI * 4) * 0.3;
  return {
    phase,
    daylight,
    isNight,
    tideHeight: lunarTide,
    waveStrength,
    currentX: Math.cos(currentAngle),
    currentY: Math.sin(currentAngle),
  };
}

/**
 * How many rings of coast the sea currently holds, 0 through TIDAL_REACH_TILES.
 *
 * The tide used to be a switch: night fell and the whole reach flooded, dawn
 * came and all of it drained. Tying the depth to how far into the night it is
 * makes the water take ground a ring at a time as the tide climbs, hold it at
 * its height, and give it back as the tide falls -- the sea eating the coast
 * rather than a mask being toggled.
 *
 * Pure and derived from the tick alone, so every client and every replay
 * floods exactly the same tiles at exactly the same moment.
 */
export function tidalFloodRings(tick: number): number {
  const phase =
    (((tick % CYCLE_TICKS) + CYCLE_TICKS) % CYCLE_TICKS) / CYCLE_TICKS;
  const solar = Math.cos(phase * Math.PI * 2);
  if (solar >= 0) return 0; // daylight: the coast is dry
  // 0 at dusk and dawn, 1 at midnight.
  const nightDepth = Math.min(1, -solar);
  // The shoreline itself goes under as soon as the sun is down; the inland
  // rings follow as the tide keeps rising.
  return Math.min(
    TIDAL_REACH_TILES + 1,
    1 + Math.floor(nightDepth * TIDAL_REACH_TILES),
  );
}

export function shipCurrentMultiplier(
  dx: number,
  dy: number,
  currentX: number,
  currentY: number,
): number {
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return 1;
  const alignment = (dx * currentX + dy * currentY) / length;
  return Math.max(0.72, Math.min(1.28, 1 + alignment * 0.28));
}

/** Stateless fractional movement schedule: deterministic across clients. */
export function shipMovementSteps(
  tick: number,
  unitId: number,
  multiplier: number,
): 0 | 1 | 2 {
  const clamped = Math.max(0.72, Math.min(1.28, multiplier));
  const fraction = Math.abs(clamped - 1);
  const phase = (((tick * 37 + unitId * 17) % 100) + 100) % 100;
  if (clamped > 1 && phase < Math.round(fraction * 100)) return 2;
  if (clamped < 1 && phase < Math.round(fraction * 100)) return 0;
  return 1;
}

export interface ShipCurrentMap {
  x(tile: number): number;
  y(tile: number): number;
  config(): { experienceMode(): "2d" | "3d" };
}

export function shipStepsForRoute(
  game: ShipCurrentMap,
  tick: number,
  unitId: number,
  from: number,
  to: number,
): 0 | 1 | 2 {
  if (game.config().experienceMode() !== "3d") return 1;
  const cycle = threeDWorldCycle(tick);
  const multiplier = shipCurrentMultiplier(
    game.x(to) - game.x(from),
    game.y(to) - game.y(from),
    cycle.currentX,
    cycle.currentY,
  );
  return shipMovementSteps(tick, unitId, multiplier);
}
