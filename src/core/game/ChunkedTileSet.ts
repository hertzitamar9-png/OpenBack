/**
 * A Set-compatible store for tile references that avoids one boxed JavaScript
 * allocation per conquered tile.
 *
 * Membership uses 1024-tile bitmaps. A compact typed insertion-order buffer
 * preserves native Set iteration semantics, which keeps deterministic games
 * and existing replays stable.
 */
interface TileChunk {
  bits: Uint32Array;
  orderIndexes?: Uint32Array;
  firstOrderIndex: number;
  lastOrderIndex: number;
}

export class ChunkedTileSet implements Set<number> {
  private static readonly CHUNK_SHIFT = 10;
  private static readonly CHUNK_SIZE = 1 << ChunkedTileSet.CHUNK_SHIFT;
  private static readonly WORD_SHIFT = 5;
  private static readonly WORDS_PER_CHUNK =
    ChunkedTileSet.CHUNK_SIZE >> ChunkedTileSet.WORD_SHIFT;
  private static readonly DELETED = 0xffffffff;

  private readonly chunks = new Map<number, TileChunk>();
  private order = new Uint32Array(64);
  private orderLength = 0;
  private size_ = 0;
  private lastChunkID = -1;
  private lastChunk: TileChunk | undefined;

  get size(): number {
    return this.size_;
  }

  add(value: number): this {
    const chunkID = value >> ChunkedTileSet.CHUNK_SHIFT;
    let chunk =
      chunkID === this.lastChunkID ? this.lastChunk : this.chunks.get(chunkID);
    if (chunk === undefined) {
      chunk = {
        bits: new Uint32Array(ChunkedTileSet.WORDS_PER_CHUNK),
        firstOrderIndex: -1,
        lastOrderIndex: -1,
      };
      this.chunks.set(chunkID, chunk);
    }
    this.lastChunkID = chunkID;
    this.lastChunk = chunk;

    const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
    const wordIndex = offset >> ChunkedTileSet.WORD_SHIFT;
    const mask = 1 << (offset & 31);
    if ((chunk.bits[wordIndex] & mask) === 0) {
      chunk.bits[wordIndex] |= mask;
      this.ensureOrderCapacity();
      this.order[this.orderLength] = value;
      // Store index + 1 so zero remains "not currently present".
      if (chunk.orderIndexes !== undefined) {
        chunk.orderIndexes[offset] = this.orderLength + 1;
      }
      if (chunk.firstOrderIndex === -1) {
        chunk.firstOrderIndex = this.orderLength;
      }
      chunk.lastOrderIndex = this.orderLength;
      this.orderLength++;
      this.size_++;
    }
    return this;
  }

  has(value: number): boolean {
    const chunkID = value >> ChunkedTileSet.CHUNK_SHIFT;
    const chunk =
      chunkID === this.lastChunkID ? this.lastChunk : this.chunks.get(chunkID);
    if (chunk === undefined) return false;
    this.lastChunkID = chunkID;
    this.lastChunk = chunk;
    const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
    return (
      (chunk.bits[offset >> ChunkedTileSet.WORD_SHIFT] &
        (1 << (offset & 31))) !==
      0
    );
  }

  delete(value: number): boolean {
    const chunkID = value >> ChunkedTileSet.CHUNK_SHIFT;
    const chunk =
      chunkID === this.lastChunkID ? this.lastChunk : this.chunks.get(chunkID);
    if (chunk === undefined) return false;
    this.lastChunkID = chunkID;
    this.lastChunk = chunk;

    const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
    const wordIndex = offset >> ChunkedTileSet.WORD_SHIFT;
    const mask = 1 << (offset & 31);
    if ((chunk.bits[wordIndex] & mask) === 0) return false;

    const orderIndexes = this.ensureOrderIndexes(
      value >> ChunkedTileSet.CHUNK_SHIFT,
      chunk,
    );
    chunk.bits[wordIndex] &= ~mask;
    const storedIndex = orderIndexes[offset];
    if (storedIndex !== 0) {
      this.order[storedIndex - 1] = ChunkedTileSet.DELETED;
      orderIndexes[offset] = 0;
    }
    this.size_--;

    // Territory can change hands repeatedly in long games. Periodic in-place
    // order compaction prevents deleted history from becoming a new leak.
    if (
      this.orderLength > 1024 &&
      this.orderLength > Math.max(1, this.size_) * 2
    ) {
      this.compactOrder();
    }
    return true;
  }

  clear(): void {
    this.chunks.clear();
    this.order = new Uint32Array(64);
    this.orderLength = 0;
    this.size_ = 0;
    this.lastChunkID = -1;
    this.lastChunk = undefined;
  }

  *values(): SetIterator<number> {
    for (let i = 0; i < this.orderLength; i++) {
      const value = this.order[i];
      if (value !== ChunkedTileSet.DELETED) yield value;
    }
  }

  keys(): SetIterator<number> {
    return this.values();
  }

  *entries(): SetIterator<[number, number]> {
    for (const value of this.values()) {
      yield [value, value];
    }
  }

  forEach(
    callbackfn: (value: number, value2: number, set: Set<number>) => void,
    thisArg?: unknown,
  ): void {
    for (const value of this.values()) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  [Symbol.iterator](): SetIterator<number> {
    return this.values();
  }

  get [Symbol.toStringTag](): string {
    return "Set";
  }

  private ensureOrderCapacity(): void {
    if (this.orderLength < this.order.length) return;
    const next = new Uint32Array(this.order.length * 2);
    next.set(this.order);
    this.order = next;
  }

  private compactOrder(): void {
    const nextCapacity = Math.max(
      64,
      2 ** Math.ceil(Math.log2(this.size_ + 1)),
    );
    const next = new Uint32Array(nextCapacity);
    for (const chunk of this.chunks.values()) {
      chunk.firstOrderIndex = -1;
      chunk.lastOrderIndex = -1;
    }
    let write = 0;
    for (let read = 0; read < this.orderLength; read++) {
      const value = this.order[read];
      if (value === ChunkedTileSet.DELETED) continue;
      next[write] = value;
      const chunk = this.chunks.get(value >> ChunkedTileSet.CHUNK_SHIFT)!;
      const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
      if (chunk.firstOrderIndex === -1) chunk.firstOrderIndex = write;
      chunk.lastOrderIndex = write;
      if (chunk.orderIndexes !== undefined) {
        chunk.orderIndexes[offset] = write + 1;
      }
      write++;
    }
    this.order = next;
    this.orderLength = write;
  }

  /**
   * Most territory chunks are only ever gained, not lost. Allocate the large
   * reverse-index table only when a deletion actually needs it.
   */
  private ensureOrderIndexes(chunkID: number, chunk: TileChunk): Uint32Array {
    if (chunk.orderIndexes !== undefined) return chunk.orderIndexes;
    const indexes = new Uint32Array(ChunkedTileSet.CHUNK_SIZE);
    const min = chunkID << ChunkedTileSet.CHUNK_SHIFT;
    const max = min + ChunkedTileSet.CHUNK_SIZE;
    const bits = chunk.bits;
    // A player's insertion history can contain millions of tiles on giant
    // maps, while one chunk only covers 1,024 tile references. Restrict the
    // one-time reverse-index scan to the insertion span in which this chunk
    // actually appeared instead of walking the player's entire history.
    for (
      let i = Math.max(0, chunk.firstOrderIndex);
      i <= chunk.lastOrderIndex && i < this.orderLength;
      i++
    ) {
      const value = this.order[i];
      if (value === ChunkedTileSet.DELETED || value < min || value >= max) {
        continue;
      }
      const offset = value - min;
      if (
        (bits[offset >> ChunkedTileSet.WORD_SHIFT] & (1 << (offset & 31))) !==
        0
      )
        indexes[offset] = i + 1;
    }
    chunk.orderIndexes = indexes;
    return indexes;
  }
}
