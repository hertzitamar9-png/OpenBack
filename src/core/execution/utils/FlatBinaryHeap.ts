import { TileRef } from "../../game/GameMap";

/**
 * Lightweight min-heap specialised for (priority:number, tile:TileRef) pairs.
 * - priorities stored in a contiguous Float32Array
 * - tiles stored in a parallel object array
 */
export class FlatBinaryHeap {
  /** parallel arrays: pri[ i ] is the priority of tiles[ i ] */
  private pri: Float32Array;
  private tiles: TileRef[];
  private len = 0; // current number of elements

  constructor(capacity = 1024) {
    this.pri = new Float32Array(capacity);
    this.tiles = new Array<TileRef>(capacity);
  }

  /** remove every element without reallocating */
  clear(): void {
    this.len = 0;
  }

  /** current heap size */
  size(): number {
    return this.len;
  }

  //insert tiles
  enqueue(tile: TileRef, priority: number): void {
    if (this.len === this.pri.length) this.grow(); // ensure space
    const pri = this.pri;
    const tiles = this.tiles;
    let i = this.len++;

    /* sift-up */
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (priority >= pri[parent]) break;
      pri[i] = pri[parent];
      tiles[i] = tiles[parent];
      i = parent;
    }
    pri[i] = priority;
    tiles[i] = tile;
  }

  /** remove and return the lowest-priority tile (no per-call allocation) */
  dequeue(): TileRef {
    if (this.len === 0) throw new Error("heap empty");

    const pri = this.pri;
    const tiles = this.tiles;
    const topTile = tiles[0];

    const newLen = --this.len;
    const lastPri = pri[newLen];
    const lastTile = tiles[newLen];

    /* sift-down */
    let i = 0;
    while (true) {
      const left = (i << 1) + 1;
      if (left >= newLen) break;
      const right = left + 1;
      const child = right < newLen && pri[right] < pri[left] ? right : left;
      if (lastPri <= pri[child]) break;
      pri[i] = pri[child];
      tiles[i] = tiles[child];
      i = child;
    }
    pri[i] = lastPri;
    tiles[i] = lastTile;
    return topTile;
  }

  /** double the underlying storage */
  private grow(): void {
    const newCap = this.pri.length << 1;

    const newPri = new Float32Array(newCap);
    newPri.set(this.pri);
    this.pri = newPri;

    this.tiles.length = newCap;
  }
}
