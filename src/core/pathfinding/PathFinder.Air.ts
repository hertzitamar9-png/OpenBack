import { Game } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { PseudoRandom } from "../PseudoRandom";
import { MinHeap } from "./algorithms/PriorityQueue";
import { PathFinder } from "./types";

export function isAircraftLandingTooHigh(
  game: {
    config(): { worldMechanics(): { threeDMode: boolean } };
    magnitude(tile: TileRef): number;
  },
  tile: TileRef,
): boolean {
  return (
    game.config().worldMechanics().threeDMode && game.magnitude(tile) >= 18
  );
}

export class AirPathFinder implements PathFinder<TileRef> {
  private seed: number;

  constructor(private game: Game) {
    this.seed = game.ticks();
  }

  findPath(from: TileRef | TileRef[], to: TileRef): TileRef[] | null {
    if (Array.isArray(from)) {
      throw new Error("AirPathFinder does not support multiple start points");
    }

    // Low-flying aircraft can route around mountains, but cannot land on a
    // tile above their fixed clearance. Classic 2D flight stays unrestricted.
    if (isAircraftLandingTooHigh(this.game, to)) {
      return null;
    }

    const random = new PseudoRandom(this.seed);
    const path: TileRef[] = [from];
    let current = from;

    while (current !== to) {
      const next = this.computeNext(current, to, random);
      if (next === current) break; // Prevent infinite loop if something breaks
      current = next;
      path.push(current);
    }

    if (
      !this.game.config().worldMechanics().threeDMode ||
      path.every((tile) => tile === to || this.game.magnitude(tile) < 18)
    ) {
      return path;
    }
    return this.findLowFlightPath(from, to);
  }

  /**
   * Low aircraft fly beneath major mountain relief. A deterministic A* route
   * treats those peaks as terrain to go around, with stable tile-order ties so
   * every client and replay selects the same corridor.
   */
  private findLowFlightPath(from: TileRef, to: TileRef): TileRef[] | null {
    const width = this.game.width();
    const total = width * this.game.height();
    const best = new Float64Array(total);
    best.fill(Number.POSITIVE_INFINITY);
    const previous = new Int32Array(total);
    previous.fill(-1);
    const open = new MinHeap(Math.max(16, total));
    const processed = new Uint8Array(total);
    open.push(from, 0);
    best[from] = 0;

    while (!open.isEmpty()) {
      const current = open.pop() as TileRef;
      if (processed[current]) continue;
      processed[current] = 1;
      if (current === to) {
        const path: TileRef[] = [];
        for (let tile = to; tile !== -1; tile = previous[tile]) path.push(tile);
        path.reverse();
        return path[0] === from ? path : null;
      }
      const x = this.game.x(current);
      const y = this.game.y(current);
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const;
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= this.game.height())
          continue;
        const next = this.game.ref(nx, ny);
        // Magnitude 18+ represents terrain above the aircraft's clearance.
        if (this.game.magnitude(next) >= 18) continue;
        const altitudeCost = 1 + Math.pow(this.game.magnitude(next) / 18, 2);
        const nextCost = best[current] + altitudeCost;
        if (nextCost >= best[next]) continue;
        best[next] = nextCost;
        previous[next] = current;
        const heuristic =
          Math.abs(nx - this.game.x(to)) + Math.abs(ny - this.game.y(to));
        open.push(next, nextCost + heuristic);
      }
    }
    return null;
  }

  private computeNext(
    from: TileRef,
    to: TileRef,
    random: PseudoRandom,
  ): TileRef {
    const x = this.game.x(from);
    const y = this.game.y(from);
    const dstX = this.game.x(to);
    const dstY = this.game.y(to);

    if (x === dstX && y === dstY) {
      return to;
    }

    let nextX = x;
    let nextY = y;
    const ratio = Math.floor(1 + Math.abs(dstY - y) / (Math.abs(dstX - x) + 1));

    if (x === dstX) {
      // Can only move in Y
      nextY += y < dstY ? 1 : -1;
    } else if (y === dstY) {
      // Can only move in X
      nextX += x < dstX ? 1 : -1;
    } else {
      if (random.chance(ratio)) {
        nextX += x < dstX ? 1 : -1;
      } else {
        nextY += y < dstY ? 1 : -1;
      }
    }

    return this.game.ref(nextX, nextY);
  }
}
