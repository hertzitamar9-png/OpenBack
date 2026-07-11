import { Game } from "../game/Game";
import { TileRef } from "../game/GameMap";

/** Deterministic A* over land tiles (8-neighbor, so ground units like tanks
 *  can travel and face diagonally). Returns null across water barriers. */
export function findLandPath(
  game: Game,
  start: TileRef,
  goal: TileRef,
): TileRef[] | null {
  if (!game.isLand(start) || !game.isLand(goal)) return null;

  const open: TileRef[] = [start];
  const openSet = new Set<TileRef>(open);
  const cameFrom = new Map<TileRef, TileRef>();
  const cost = new Map<TileRef, number>([[start, 0]]);

  const gx = game.x(goal);
  const gy = game.y(goal);
  // Octile distance: exact minimum cost for 8-neighbor movement (keeps A*
  // admissible). Diagonal steps cost SQRT2, cardinal steps cost 1.
  const octile = (t: TileRef): number => {
    const dx = Math.abs(game.x(t) - gx);
    const dy = Math.abs(game.y(t) - gy);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };

  while (open.length > 0) {
    open.sort((a, b) => {
      const scoreA = cost.get(a)! + octile(a);
      const scoreB = cost.get(b)! + octile(b);
      // All equal-score choices are equally short. Prefer the tile whose X/Y
      // progress is most balanced so open ground becomes a plane-like
      // staircase instead of one long straight followed by a hard turn.
      const balanceA = Math.abs(
        Math.abs(gx - game.x(a)) - Math.abs(gy - game.y(a)),
      );
      const balanceB = Math.abs(
        Math.abs(gx - game.x(b)) - Math.abs(gy - game.y(b)),
      );
      return scoreA - scoreB || balanceA - balanceB || a - b;
    });
    const current = open.shift()!;
    openSet.delete(current);
    if (current === goal) {
      const path = [current];
      while (cameFrom.has(path[0])) path.unshift(cameFrom.get(path[0])!);
      return path;
    }

    const cx = game.x(current);
    const cy = game.y(current);
    game.forEachNeighborWithDiag(current, (neighbor) => {
      if (!game.isLand(neighbor)) return;
      const dx = Math.abs(game.x(neighbor) - cx);
      const dy = Math.abs(game.y(neighbor) - cy);
      // Tanks are ground vehicles: don't cut across a water corner.
      if (dx === 1 && dy === 1) {
        if (
          !game.isLand(game.ref(cx, game.y(neighbor))) ||
          !game.isLand(game.ref(game.x(neighbor), cy))
        ) {
          return;
        }
      }
      const stepCost = dx === 1 && dy === 1 ? Math.SQRT2 : 1;
      const nextCost = cost.get(current)! + stepCost;
      if (nextCost >= (cost.get(neighbor) ?? Infinity)) return;
      cameFrom.set(neighbor, current);
      cost.set(neighbor, nextCost);
      if (!openSet.has(neighbor)) {
        open.push(neighbor);
        openSet.add(neighbor);
      }
    });
  }
  return null;
}
