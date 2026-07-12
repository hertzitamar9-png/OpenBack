import { Game, Player } from "../game/Game";
import { TileRef } from "../game/GameMap";

/**
 * Plane landings are intentionally disconnected beachheads. Automatic
 * surrounded-cluster annexation would erase them without combat, so remember
 * their tiles (with a registration tick) while they remain owned by the
 * landing player. The exemption only lasts a short grace window
 * (Config.planeBeachheadGraceTicks) — after that the beachhead is annexed
 * like any other pocket, and the player can still be annexed elsewhere.
 *
 * Stored as Map<tile, tick> so each landing tile is tracked individually and
 * expires on its own 15-second timer.
 */
const planeBeachheads = new WeakMap<Game, Map<number, Map<TileRef, number>>>();
const planeLandingAnimations = new WeakMap<Game, Map<TileRef, number>>();

/** Reserve the green crash footprint until its visual landing phase finishes. */
export function registerPlaneLandingAnimation(
  game: Game,
  tiles: Iterable<TileRef>,
  durationTicks: number,
): void {
  let protectedTiles = planeLandingAnimations.get(game);
  if (protectedTiles === undefined) {
    protectedTiles = new Map();
    planeLandingAnimations.set(game, protectedTiles);
  }
  const expiresAt = game.ticks() + durationTicks;
  for (const tile of tiles) protectedTiles.set(tile, expiresAt);
}

/** Prevent land attacks from stealing the temporary green crash animation. */
export function isPlaneLandingAnimationTile(
  game: Game,
  tile: TileRef,
): boolean {
  const protectedTiles = planeLandingAnimations.get(game);
  const expiresAt = protectedTiles?.get(tile);
  if (expiresAt === undefined) return false;
  if (game.ticks() >= expiresAt) {
    protectedTiles!.delete(tile);
    return false;
  }
  return true;
}

export function registerPlaneBeachhead(
  game: Game,
  player: Player,
  tiles: Iterable<TileRef>,
): void {
  const tick = game.ticks();
  let byPlayer = planeBeachheads.get(game);
  if (byPlayer === undefined) {
    byPlayer = new Map();
    planeBeachheads.set(game, byPlayer);
  }
  let protectedTiles = byPlayer.get(player.smallID());
  if (protectedTiles === undefined) {
    protectedTiles = new Map();
    byPlayer.set(player.smallID(), protectedTiles);
  }
  for (const tile of tiles) protectedTiles.set(tile, tick);
}

/** True if `cluster` overlaps a still-active plane beachhead of `player`. */
export function isPlaneBeachhead(
  game: Game,
  player: Player,
  cluster: Set<TileRef>,
): boolean {
  const byPlayer = planeBeachheads.get(game);
  const protectedTiles = byPlayer?.get(player.smallID());
  if (protectedTiles === undefined || protectedTiles.size === 0) return false;

  const now = game.ticks();
  const grace = game.config().planeBeachheadGraceTicks();
  let intersects = false;
  for (const [tile, registered] of protectedTiles) {
    // Expired or captured by an enemy: the exemption is gone for good.
    if (now - registered > grace || game.ownerID(tile) !== player.smallID()) {
      protectedTiles.delete(tile);
      continue;
    }
    if (cluster.has(tile)) intersects = true;
  }
  if (protectedTiles.size === 0) byPlayer!.delete(player.smallID());
  return intersects;
}

/** True while at least one original landing tile still belongs to the player
 *  and is within the grace window. */
export function hasPlaneBeachhead(game: Game, player: Player): boolean {
  const byPlayer = planeBeachheads.get(game);
  const protectedTiles = byPlayer?.get(player.smallID());
  if (protectedTiles === undefined) return false;

  const now = game.ticks();
  const grace = game.config().planeBeachheadGraceTicks();
  for (const [tile, registered] of protectedTiles) {
    if (now - registered > grace || game.ownerID(tile) !== player.smallID()) {
      protectedTiles.delete(tile);
    }
  }
  if (protectedTiles.size === 0) {
    byPlayer!.delete(player.smallID());
    return false;
  }
  return true;
}
