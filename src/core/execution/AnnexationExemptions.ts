import { Game, Player } from "../game/Game";
import { TileRef } from "../game/GameMap";

/**
 * Plane landings are intentionally disconnected beachheads. Automatic
 * surrounded-cluster annexation would erase them without combat, so remember
 * their tiles while they remain owned by the landing player.
 */
const planeBeachheads = new WeakMap<Game, Map<number, Set<TileRef>>>();

export function registerPlaneBeachhead(
  game: Game,
  player: Player,
  tiles: Iterable<TileRef>,
): void {
  let byPlayer = planeBeachheads.get(game);
  if (byPlayer === undefined) {
    byPlayer = new Map();
    planeBeachheads.set(game, byPlayer);
  }
  let protectedTiles = byPlayer.get(player.smallID());
  if (protectedTiles === undefined) {
    protectedTiles = new Set();
    byPlayer.set(player.smallID(), protectedTiles);
  }
  for (const tile of tiles) protectedTiles.add(tile);
}

export function isPlaneBeachhead(
  game: Game,
  player: Player,
  cluster: Set<TileRef>,
): boolean {
  const byPlayer = planeBeachheads.get(game);
  const protectedTiles = byPlayer?.get(player.smallID());
  if (protectedTiles === undefined) return false;

  let intersects = false;
  for (const tile of protectedTiles) {
    // Once an enemy fights for and captures a landing tile, it permanently
    // loses its exemption. Recapturing it later does not restore protection.
    if (game.ownerID(tile) !== player.smallID()) {
      protectedTiles.delete(tile);
    } else if (cluster.has(tile)) {
      intersects = true;
    }
  }
  if (protectedTiles.size === 0) byPlayer!.delete(player.smallID());
  return intersects;
}

/** True while at least one original landing tile still belongs to the player. */
export function hasPlaneBeachhead(game: Game, player: Player): boolean {
  const byPlayer = planeBeachheads.get(game);
  const protectedTiles = byPlayer?.get(player.smallID());
  if (protectedTiles === undefined) return false;
  for (const tile of protectedTiles) {
    if (game.ownerID(tile) !== player.smallID()) protectedTiles.delete(tile);
  }
  if (protectedTiles.size === 0) {
    byPlayer!.delete(player.smallID());
    return false;
  }
  return true;
}
