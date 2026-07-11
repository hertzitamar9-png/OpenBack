import { Game } from "../game/Game";
import { TileRef } from "../game/GameMap";

/** Deterministic A* over land tiles. Returns null across water barriers. */
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

  while (open.length > 0) {
    open.sort((a, b) => {
      const scoreA = cost.get(a)! + game.manhattanDist(a, goal);
      const scoreB = cost.get(b)! + game.manhattanDist(b, goal);
      return scoreA - scoreB || a - b;
    });
    const current = open.shift()!;
    openSet.delete(current);
    if (current === goal) {
      const path = [current];
      while (cameFrom.has(path[0])) path.unshift(cameFrom.get(path[0])!);
      return path;
    }

    for (const neighbor of game.neighbors(current)) {
      if (!game.isLand(neighbor)) continue;
      const nextCost = cost.get(current)! + 1;
      if (nextCost >= (cost.get(neighbor) ?? Infinity)) continue;
      cameFrom.set(neighbor, current);
      cost.set(neighbor, nextCost);
      if (!openSet.has(neighbor)) {
        open.push(neighbor);
        openSet.add(neighbor);
      }
    }
  }
  return null;
}
