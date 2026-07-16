import { Cell, TerrainType } from "./Game";

export type TileRef = number;

export interface GameMap {
  ref(x: number, y: number): TileRef;
  isValidRef(ref: TileRef): boolean;
  x(ref: TileRef): number;
  y(ref: TileRef): number;
  cell(ref: TileRef): Cell;
  width(): number;
  height(): number;
  numLandTiles(): number;

  isValidCoord(x: number, y: number): boolean;
  // Terrain getters
  isLand(ref: TileRef): boolean;
  isOceanShore(ref: TileRef): boolean;
  isOcean(ref: TileRef): boolean;
  isShoreline(ref: TileRef): boolean;
  magnitude(ref: TileRef): number;
  terrainByte(ref: TileRef): number;
  // Terrain setters
  setWater(ref: TileRef): void;
  setShorelineBit(ref: TileRef): void;
  clearShorelineBit(ref: TileRef): void;
  setOcean(ref: TileRef): void;
  setMagnitude(ref: TileRef, value: number): void;
  // State getters and setters (mutable)
  ownerID(ref: TileRef): number;
  hasOwner(ref: TileRef): boolean;

  setOwnerID(ref: TileRef, playerId: number): void;
  hasFallout(ref: TileRef): boolean;
  setFallout(ref: TileRef, value: boolean): void;
  isOnEdgeOfMap(ref: TileRef): boolean;
  isBorder(ref: TileRef): boolean;
  /** Border check when the caller already loaded the tile owner. */
  isBorderForOwner(ref: TileRef, ownerID: number): boolean;
  neighbors(ref: TileRef): TileRef[];
  // Zero-allocation neighbor iteration (cardinal only), in W, E, N, S order.
  forEachNeighbor(ref: TileRef, callback: (neighbor: TileRef) => void): void;
  // Writes the cardinal neighbors of ref into out (W, E, N, S order) and
  // returns the count. out must have length >= 4; reuse it across calls to
  // avoid allocation in hot loops.
  neighbors4(ref: TileRef, out: TileRef[]): number;
  // Writes all eight neighbors in the same order as
  // forEachNeighborWithDiag, without allocating a callback closure.
  neighbors8(ref: TileRef, out: TileRef[]): number;
  // Zero-allocation neighbor iteration including diagonals, in dx-major
  // order: (-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1).
  forEachNeighborWithDiag(
    ref: TileRef,
    callback: (neighbor: TileRef) => void,
  ): void;
  isWater(ref: TileRef): boolean;
  isShore(ref: TileRef): boolean;
  cost(ref: TileRef): number;
  terrainType(ref: TileRef): TerrainType;
  forEachTile(fn: (tile: TileRef) => void): void;

  manhattanDist(c1: TileRef, c2: TileRef): number;
  euclideanDistSquared(c1: TileRef, c2: TileRef): number;
  circleSearch(
    tile: TileRef,
    radius: number,
    filter?: (tile: TileRef, d2: number) => boolean,
  ): Set<TileRef>;
  bfs(
    tile: TileRef,
    filter: (gm: GameMap, tile: TileRef) => boolean,
  ): Set<TileRef>;

  /**
   * Returns the packed per-tile state as an unsigned 16-bit value (`0..65535`).
   *
   * Backed by a `Uint16Array` in `GameMapImpl`, so callers must treat this as `uint16`.
   */
  tileState(tile: TileRef): number;

  /**
   * Applies a packed per-tile state value.
   *
   * `state` must be an unsigned 16-bit value (`0..65535`). Implementations may
   * store this in a `Uint16Array` and will truncate higher bits if provided.
   *
   * Returns `true` when the terrain byte changed (land/water/shoreline/magnitude).
   */
  updateTile(tile: TileRef, state: number): boolean;

  /**
   * Direct access to the per-tile state buffer for zero-copy consumers
   * (e.g. WebGL renderer uploading to a R16UI texture).
   *
   * The returned array is a live reference — it is mutated by `updateTile()`
   * each tick. Callers must not write to it.
   *
   * The bit layout of each `uint16` matches the renderer's tile state:
   *   bits  0-11: ownerID
   *   bit   13:  fallout
   *   bit   14:  defense bonus
   */
  tileStateBuffer(): Uint16Array;

  /**
   * Direct read-only access to packed terrain bytes for performance-critical
   * simulation loops. Callers must not mutate the returned array.
   */
  terrainBuffer(): Uint8Array;

  numTilesWithFallout(): number;
}

export class GameMapImpl implements GameMap {
  private _numTilesWithFallout = 0;

  private readonly terrain: Uint8Array; // Immutable terrain data
  private readonly state: Uint16Array; // Mutable game state
  private readonly width_: number;
  private readonly height_: number;

  // Terrain bits (Uint8Array)
  private static readonly IS_LAND_BIT = 7;
  private static readonly SHORELINE_BIT = 6;
  private static readonly OCEAN_BIT = 5;
  private static readonly MAGNITUDE_MASK = 0x1f; // 11111 in binary

  // State bits (Uint16Array)
  private static readonly PLAYER_ID_MASK = 0xfff;
  private static readonly FALLOUT_BIT = 13;
  private static readonly DEFENSE_BONUS_BIT = 14;
  // Bit 15 still reserved

  constructor(
    width: number,
    height: number,
    terrainData: Uint8Array,
    private numLandTiles_: number,
  ) {
    if (terrainData.length !== width * height) {
      throw new Error(
        `Terrain data length ${terrainData.length} doesn't match dimensions ${width}x${height}`,
      );
    }
    this.width_ = width;
    this.height_ = height;
    this.terrain = terrainData;
    this.state = new Uint16Array(width * height);
  }
  numTilesWithFallout(): number {
    return this._numTilesWithFallout;
  }

  ref(x: number, y: number): TileRef {
    if (!this.isValidCoord(x, y)) {
      throw new Error(`Invalid coordinates: ${x},${y}`);
    }
    return y * this.width_ + x;
  }

  isValidRef(ref: TileRef): boolean {
    return Number.isInteger(ref) && ref >= 0 && ref < this.state.length;
  }

  x(ref: TileRef): number {
    return ref % this.width_;
  }

  y(ref: TileRef): number {
    return Math.floor(ref / this.width_);
  }

  cell(ref: TileRef): Cell {
    return new Cell(this.x(ref), this.y(ref));
  }

  width(): number {
    return this.width_;
  }
  height(): number {
    return this.height_;
  }
  numLandTiles(): number {
    return this.numLandTiles_;
  }

  isValidCoord(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      x < this.width_ &&
      y >= 0 &&
      y < this.height_
    );
  }

  // Terrain getters (immutable)
  isLand(ref: TileRef): boolean {
    return (this.terrain[ref] & (1 << GameMapImpl.IS_LAND_BIT)) !== 0;
  }

  isOceanShore(ref: TileRef): boolean {
    if (!this.isLand(ref)) {
      return false;
    }
    const w = this.width_;
    const x = ref % w;
    if (x !== 0 && this.isOcean(ref - 1)) return true;
    if (x !== w - 1 && this.isOcean(ref + 1)) return true;
    if (ref >= w && this.isOcean(ref - w)) return true;
    if (ref + w < this.terrain.length && this.isOcean(ref + w)) return true;
    return false;
  }

  isOcean(ref: TileRef): boolean {
    return (this.terrain[ref] & (1 << GameMapImpl.OCEAN_BIT)) !== 0;
  }

  isShoreline(ref: TileRef): boolean {
    return (this.terrain[ref] & (1 << GameMapImpl.SHORELINE_BIT)) !== 0;
  }

  magnitude(ref: TileRef): number {
    return this.terrain[ref] & GameMapImpl.MAGNITUDE_MASK;
  }

  terrainByte(ref: TileRef): number {
    return this.terrain[ref];
  }

  setWater(ref: TileRef): void {
    if (!this.isLand(ref)) return;
    this.terrain[ref] = 0; // Lake water: no land, no ocean, no shoreline, magnitude 0
    this.numLandTiles_--;
  }

  setShorelineBit(ref: TileRef): void {
    this.terrain[ref] |= 1 << GameMapImpl.SHORELINE_BIT;
  }

  clearShorelineBit(ref: TileRef): void {
    this.terrain[ref] &= ~(1 << GameMapImpl.SHORELINE_BIT);
  }

  setOcean(ref: TileRef): void {
    this.terrain[ref] |= 1 << GameMapImpl.OCEAN_BIT;
  }

  setMagnitude(ref: TileRef, value: number): void {
    this.terrain[ref] =
      (this.terrain[ref] & ~GameMapImpl.MAGNITUDE_MASK) |
      (value & GameMapImpl.MAGNITUDE_MASK);
  }

  // State getters and setters (mutable)
  ownerID(ref: TileRef): number {
    return this.state[ref] & GameMapImpl.PLAYER_ID_MASK;
  }

  hasOwner(ref: TileRef): boolean {
    return this.ownerID(ref) !== 0;
  }

  setOwnerID(ref: TileRef, playerId: number): void {
    if (playerId > GameMapImpl.PLAYER_ID_MASK) {
      throw new Error(
        `Player ID ${playerId} exceeds maximum value ${GameMapImpl.PLAYER_ID_MASK}`,
      );
    }
    this.state[ref] =
      (this.state[ref] & ~GameMapImpl.PLAYER_ID_MASK) | playerId;
  }

  hasFallout(ref: TileRef): boolean {
    return (this.state[ref] & (1 << GameMapImpl.FALLOUT_BIT)) !== 0;
  }

  setFallout(ref: TileRef, value: boolean): void {
    const existingFallout = this.hasFallout(ref);
    if (value) {
      if (!existingFallout) {
        this._numTilesWithFallout++;
        this.state[ref] |= 1 << GameMapImpl.FALLOUT_BIT;
      }
    } else {
      if (existingFallout) {
        this._numTilesWithFallout--;
        this.state[ref] &= ~(1 << GameMapImpl.FALLOUT_BIT);
      }
    }
  }

  isOnEdgeOfMap(ref: TileRef): boolean {
    const x = ref % this.width_;
    return (
      x === 0 ||
      x === this.width_ - 1 ||
      ref < this.width_ ||
      ref >= this.state.length - this.width_
    );
  }

  isBorder(ref: TileRef): boolean {
    return this.isBorderForOwner(ref, this.ownerID(ref));
  }

  isBorderForOwner(ref: TileRef, ownerID: number): boolean {
    const w = this.width_;
    const x = ref % w;
    const state = this.state;
    const mask = GameMapImpl.PLAYER_ID_MASK;
    if (x !== 0 && (state[ref - 1] & mask) !== ownerID) return true;
    if (x !== w - 1 && (state[ref + 1] & mask) !== ownerID) return true;
    if (ref >= w && (state[ref - w] & mask) !== ownerID) return true;
    if (ref + w < state.length && (state[ref + w] & mask) !== ownerID) {
      return true;
    }
    return false;
  }

  hasDefenseBonus(ref: TileRef): boolean {
    return (this.state[ref] & (1 << GameMapImpl.DEFENSE_BONUS_BIT)) !== 0;
  }

  setDefenseBonus(ref: TileRef, value: boolean): void {
    if (value) {
      this.state[ref] |= 1 << GameMapImpl.DEFENSE_BONUS_BIT;
    } else {
      this.state[ref] &= ~(1 << GameMapImpl.DEFENSE_BONUS_BIT);
    }
  }

  // Helper methods
  isWater(ref: TileRef): boolean {
    return !this.isLand(ref);
  }

  isShore(ref: TileRef): boolean {
    return this.isLand(ref) && this.isShoreline(ref);
  }

  cost(ref: TileRef): number {
    return this.magnitude(ref) < 10 ? 2 : 1;
  }

  // if updating these magnitude values, also update
  // `../../../map-generator/map_generator.go` `getThumbnailColor`
  terrainType(ref: TileRef): TerrainType {
    if (this.isLand(ref)) {
      const magnitude = this.magnitude(ref);
      if (magnitude < 10) return TerrainType.Plains;
      if (magnitude < 20) return TerrainType.Highland;
      return TerrainType.Mountain;
    }
    return TerrainType.Ocean;
  }

  neighbors(ref: TileRef): TileRef[] {
    const neighbors: TileRef[] = [];
    const w = this.width_;
    const x = ref % w;

    if (ref >= w) neighbors.push(ref - w);
    if (ref + w < this.state.length) neighbors.push(ref + w);
    if (x !== 0) neighbors.push(ref - 1);
    if (x !== w - 1) neighbors.push(ref + 1);

    return neighbors;
  }

  forEachNeighbor(ref: TileRef, callback: (neighbor: TileRef) => void): void {
    const w = this.width_;
    const x = ref % w;

    if (x !== 0) callback(ref - 1);
    if (x !== w - 1) callback(ref + 1);
    if (ref >= w) callback(ref - w);
    if (ref + w < this.state.length) callback(ref + w);
  }

  neighbors4(ref: TileRef, out: TileRef[]): number {
    const w = this.width_;
    const x = ref % w;
    let n = 0;

    if (x !== 0) out[n++] = ref - 1;
    if (x !== w - 1) out[n++] = ref + 1;
    if (ref >= w) out[n++] = ref - w;
    if (ref + w < this.state.length) out[n++] = ref + w;
    return n;
  }

  neighbors8(ref: TileRef, out: TileRef[]): number {
    const w = this.width_;
    const x = ref % w;
    const hasN = ref >= w;
    const hasS = ref + w < this.state.length;
    let n = 0;

    if (x !== 0) {
      if (hasN) out[n++] = ref - 1 - w;
      out[n++] = ref - 1;
      if (hasS) out[n++] = ref - 1 + w;
    }
    if (hasN) out[n++] = ref - w;
    if (hasS) out[n++] = ref + w;
    if (x !== w - 1) {
      if (hasN) out[n++] = ref + 1 - w;
      out[n++] = ref + 1;
      if (hasS) out[n++] = ref + 1 + w;
    }
    return n;
  }

  forEachNeighborWithDiag(
    ref: TileRef,
    callback: (neighbor: TileRef) => void,
  ): void {
    const w = this.width_;
    const x = ref % w;
    const hasN = ref >= w;
    const hasS = ref + w < this.state.length;

    if (x !== 0) {
      if (hasN) callback(ref - 1 - w);
      callback(ref - 1);
      if (hasS) callback(ref - 1 + w);
    }
    if (hasN) callback(ref - w);
    if (hasS) callback(ref + w);
    if (x !== w - 1) {
      if (hasN) callback(ref + 1 - w);
      callback(ref + 1);
      if (hasS) callback(ref + 1 + w);
    }
  }

  forEachTile(fn: (tile: TileRef) => void): void {
    for (let ref: TileRef = 0; ref < this.width_ * this.height_; ref++) {
      fn(ref);
    }
  }

  manhattanDist(c1: TileRef, c2: TileRef): number {
    return (
      Math.abs(this.x(c1) - this.x(c2)) + Math.abs(this.y(c1) - this.y(c2))
    );
  }
  euclideanDistSquared(c1: TileRef, c2: TileRef): number {
    const x = this.x(c1) - this.x(c2);
    const y = this.y(c1) - this.y(c2);
    return x * x + y * y;
  }
  circleSearch(
    tile: TileRef,
    radius: number,
    filter?: (tile: TileRef, d2: number) => boolean,
  ): Set<TileRef> {
    const center = { x: this.x(tile), y: this.y(tile) };
    const tiles: Set<TileRef> = new Set<TileRef>();
    const minX = Math.max(0, center.x - radius);
    const maxX = Math.min(this.width_ - 1, center.x + radius);
    const minY = Math.max(0, center.y - radius);
    const maxY = Math.min(this.height_ - 1, center.y + radius);
    for (let i = minX; i <= maxX; ++i) {
      for (let j = minY; j <= maxY; j++) {
        const t = j * this.width_ + i;
        const dx = center.x - i;
        const dy = center.y - j;
        const d2 = dx * dx + dy * dy;
        if (d2 > radius * radius) continue;
        if (!filter || filter(t, d2)) {
          tiles.add(t);
        }
      }
    }
    return tiles;
  }
  bfs(
    tile: TileRef,
    filter: (gm: GameMap, tile: TileRef) => boolean,
  ): Set<TileRef> {
    const seen = new Set<TileRef>();
    const q: TileRef[] = [];
    if (filter(this, tile)) {
      seen.add(tile);
      q.push(tile);
    }

    while (q.length > 0) {
      const curr = q.pop();
      if (curr === undefined) continue;
      for (const n of this.neighbors(curr)) {
        if (!seen.has(n) && filter(this, n)) {
          seen.add(n);
          q.push(n);
        }
      }
    }
    return seen;
  }

  tileState(tile: TileRef): number {
    return this.state[tile];
  }

  tileStateBuffer(): Uint16Array {
    return this.state;
  }

  terrainBuffer(): Uint8Array {
    return this.terrain;
  }

  /**
   * Update a tile from a packed uint32:
   *   bits  0-15: tile state (owner, fallout, etc.)
   *   bits 16-23: terrain byte (land, ocean, shoreline, magnitude)
   */
  updateTile(tile: TileRef, packed: number): boolean {
    const state = packed & 0xffff;
    const terrainByte = (packed >>> 16) & 0xff;

    const existingFallout = this.hasFallout(tile);
    this.state[tile] = state;
    const newFallout = this.hasFallout(tile);
    if (existingFallout && !newFallout) {
      this._numTilesWithFallout--;
    }
    if (!existingFallout && newFallout) {
      this._numTilesWithFallout++;
    }

    // Update terrain if the packed value includes a terrain byte that differs
    const terrainChanged = this.terrain[tile] !== terrainByte;
    if (terrainChanged) {
      const wasLand = this.isLand(tile);
      this.terrain[tile] = terrainByte;
      const isNowLand = Boolean(terrainByte & (1 << GameMapImpl.IS_LAND_BIT));
      if (wasLand && !isNowLand) this.numLandTiles_--;
      else if (!wasLand && isNowLand) this.numLandTiles_++;
    }
    return terrainChanged;
  }
}

export function euclDistFN(
  root: TileRef,
  dist: number,
  center: boolean = false,
): (gm: GameMap, tile: TileRef) => boolean {
  const dist2 = dist * dist;
  if (!center) {
    return (gm: GameMap, n: TileRef) =>
      gm.euclideanDistSquared(root, n) <= dist2;
  } else {
    return (gm: GameMap, n: TileRef) => {
      // shifts the root tile’s coordinates by -0.5 so that its “center”
      // center becomes the corner of four pixels rather than the middle of one pixel.
      // just makes things based off even pixels instead of odd. Used to use 9x9 icons now 10x10 icons etc...
      const rootX = gm.x(root) - 0.5;
      const rootY = gm.y(root) - 0.5;
      const dx = gm.x(n) - rootX;
      const dy = gm.y(n) - rootY;
      return dx * dx + dy * dy <= dist2;
    };
  }
}

export function manhattanDistFN(
  root: TileRef,
  dist: number,
  center: boolean = false,
): (gm: GameMap, tile: TileRef) => boolean {
  if (!center) {
    return (gm: GameMap, n: TileRef) => gm.manhattanDist(root, n) <= dist;
  } else {
    return (gm: GameMap, n: TileRef) => {
      const rootX = gm.x(root) - 0.5;
      const rootY = gm.y(root) - 0.5;
      const dx = Math.abs(gm.x(n) - rootX);
      const dy = Math.abs(gm.y(n) - rootY);
      return dx + dy <= dist;
    };
  }
}

export function rectDistFN(
  root: TileRef,
  dist: number,
  center: boolean = false,
): (gm: GameMap, tile: TileRef) => boolean {
  if (!center) {
    return (gm: GameMap, n: TileRef) => {
      const dx = Math.abs(gm.x(n) - gm.x(root));
      const dy = Math.abs(gm.y(n) - gm.y(root));
      return dx <= dist && dy <= dist;
    };
  } else {
    return (gm: GameMap, n: TileRef) => {
      const rootX = gm.x(root) - 0.5;
      const rootY = gm.y(root) - 0.5;
      const dx = Math.abs(gm.x(n) - rootX);
      const dy = Math.abs(gm.y(n) - rootY);
      return dx <= dist && dy <= dist;
    };
  }
}

function isInIsometricTile(
  center: { x: number; y: number },
  tile: { x: number; y: number },
  yOffset: number,
  distance: number,
): boolean {
  const dx = Math.abs(tile.x - center.x);
  const dy = Math.abs(tile.y - (center.y + yOffset));
  return dx + dy * 2 <= distance + 1;
}

export function isometricDistFN(
  root: TileRef,
  dist: number,
  center: boolean = false,
): (gm: GameMap, tile: TileRef) => boolean {
  if (!center) {
    return (gm: GameMap, n: TileRef) => gm.manhattanDist(root, n) <= dist;
  } else {
    return (gm: GameMap, n: TileRef) => {
      const rootX = gm.x(root) - 0.5;
      const rootY = gm.y(root) - 0.5;

      return isInIsometricTile(
        { x: rootX, y: rootY },
        { x: gm.x(n), y: gm.y(n) },
        0,
        dist,
      );
    };
  }
}

export function hexDistFN(
  root: TileRef,
  dist: number,
  center: boolean = false,
): (gm: GameMap, tile: TileRef) => boolean {
  if (!center) {
    return (gm: GameMap, n: TileRef) => {
      const dx = Math.abs(gm.x(n) - gm.x(root));
      const dy = Math.abs(gm.y(n) - gm.y(root));
      return dx <= dist && dy <= dist && dx + dy <= dist * 1.5;
    };
  } else {
    return (gm: GameMap, n: TileRef) => {
      const rootX = gm.x(root) - 0.5;
      const rootY = gm.y(root) - 0.5;
      const dx = Math.abs(gm.x(n) - rootX);
      const dy = Math.abs(gm.y(n) - rootY);
      return dx <= dist && dy <= dist && dx + dy <= dist * 1.5;
    };
  }
}

export function andFN(
  x: (gm: GameMap, tile: TileRef) => boolean,
  y: (gm: GameMap, tile: TileRef) => boolean,
): (gm: GameMap, tile: TileRef) => boolean {
  return (gm: GameMap, tile: TileRef) => x(gm, tile) && y(gm, tile);
}
