import { Game } from "../game/Game";
import { TileRef } from "../game/GameMap";

/**
 * Collect land tiles that are path-connected to start and whose destination
 * lies within maxDistance. The flood fill may travel outside that radius so
 * it preserves findLandPath's behavior around bays and other obstacles.
 */
export function reachableLandTiles(
  game: Game,
  start: TileRef,
  maxDistance: number,
): Set<TileRef> {
  const reachable = new Set<TileRef>();
  if (!game.isLand(start)) return reachable;

  const visited = new Uint8Array(game.width() * game.height());
  const queue: TileRef[] = [start];
  visited[start] = 1;
  const sx = game.x(start);
  const sy = game.y(start);
  const maxDistanceSquared = maxDistance * maxDistance;
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const cx = game.x(current);
    const cy = game.y(current);
    const fromStartX = cx - sx;
    const fromStartY = cy - sy;
    if (
      fromStartX * fromStartX + fromStartY * fromStartY <=
      maxDistanceSquared
    ) {
      reachable.add(current);
    }

    game.forEachNeighborWithDiag(current, (neighbor) => {
      if (visited[neighbor] !== 0 || !game.isLand(neighbor)) return;
      const dx = Math.abs(game.x(neighbor) - cx);
      const dy = Math.abs(game.y(neighbor) - cy);
      if (
        dx === 1 &&
        dy === 1 &&
        (!game.isLand(game.ref(cx, game.y(neighbor))) ||
          !game.isLand(game.ref(game.x(neighbor), cy)))
      ) {
        return;
      }
      visited[neighbor] = 1;
      queue.push(neighbor);
    });
  }

  return reachable;
}

/** Deterministic A* over land tiles (8-neighbor, so ground units like tanks
 *  can travel and face diagonally). Returns null across water barriers. */
export function findLandPath(
  game: Game,
  start: TileRef,
  goal: TileRef,
): TileRef[] | null {
  if (!game.isLand(start) || !game.isLand(goal)) return null;

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

  type FrontierNode = { tile: TileRef; pathCost: number };
  const compare = (a: FrontierNode, b: FrontierNode): number => {
    const scoreA = a.pathCost + octile(a.tile);
    const scoreB = b.pathCost + octile(b.tile);
    // Preserve the original deterministic tie-breaking exactly: balanced
    // diagonal progress first, then the stable tile reference.
    const balanceA = Math.abs(
      Math.abs(gx - game.x(a.tile)) - Math.abs(gy - game.y(a.tile)),
    );
    const balanceB = Math.abs(
      Math.abs(gx - game.x(b.tile)) - Math.abs(gy - game.y(b.tile)),
    );
    return scoreA - scoreB || balanceA - balanceB || a.tile - b.tile;
  };
  const open: FrontierNode[] = [{ tile: start, pathCost: 0 }];
  const enqueue = (node: FrontierNode): void => {
    let index = open.length;
    open.push(node);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (compare(open[parent], node) <= 0) break;
      open[index] = open[parent];
      index = parent;
    }
    open[index] = node;
  };
  const dequeue = (): FrontierNode => {
    const first = open[0];
    const last = open.pop()!;
    if (open.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= open.length) break;
      const right = left + 1;
      const child =
        right < open.length && compare(open[right], open[left]) < 0
          ? right
          : left;
      if (compare(last, open[child]) <= 0) break;
      open[index] = open[child];
      index = child;
    }
    open[index] = last;
    return first;
  };

  while (open.length > 0) {
    const next = dequeue();
    const current = next.tile;
    // A cheaper path may have queued a newer entry for the same tile. Ignore
    // the stale entry without needing an O(n) decrease-key search.
    if (next.pathCost !== cost.get(current)) continue;
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
      enqueue({ tile: neighbor, pathCost: nextCost });
    });
  }
  return null;
}
