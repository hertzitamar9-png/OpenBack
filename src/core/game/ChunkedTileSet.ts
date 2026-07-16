/**
 * A Set-compatible store for tile references that avoids one boxed JavaScript
 * allocation per conquered tile.
 *
 * Membership uses 1024-tile bitmaps. A compact typed insertion-order buffer
 * preserves native Set iteration semantics, which keeps deterministic games
 * and existing replays stable.
 */
export class ChunkedTileSet implements Set<number> {
  private static readonly CHUNK_SHIFT = 10;
  private static readonly CHUNK_SIZE = 1 << ChunkedTileSet.CHUNK_SHIFT;
  private static readonly WORD_SHIFT = 5;
  private static readonly WORDS_PER_CHUNK =
    ChunkedTileSet.CHUNK_SIZE >> ChunkedTileSet.WORD_SHIFT;
  private static readonly DELETED = 0xffffffff;

  private readonly chunks = new Map<
    number,
    { bits: Uint32Array; orderIndexes: Uint32Array }
  >();
  private order = new Uint32Array(64);
  private orderLength = 0;
  private size_ = 0;

  get size(): number {
    return this.size_;
  }

  add(value: number): this {
    const chunkID = value >> ChunkedTileSet.CHUNK_SHIFT;
    let chunk = this.chunks.get(chunkID);
    if (chunk === undefined) {
      chunk = {
        bits: new Uint32Array(ChunkedTileSet.WORDS_PER_CHUNK),
        orderIndexes: new Uint32Array(ChunkedTileSet.CHUNK_SIZE),
      };
      this.chunks.set(chunkID, chunk);
    }

    const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
    const wordIndex = offset >> ChunkedTileSet.WORD_SHIFT;
    const mask = 1 << (offset & 31);
    if ((chunk.bits[wordIndex] & mask) === 0) {
      chunk.bits[wordIndex] |= mask;
      this.ensureOrderCapacity();
      this.order[this.orderLength] = value;
      // Store index + 1 so zero remains "not currently present".
      chunk.orderIndexes[offset] = this.orderLength + 1;
      this.orderLength++;
      this.size_++;
    }
    return this;
  }

  has(value: number): boolean {
    const chunk = this.chunks.get(value >> ChunkedTileSet.CHUNK_SHIFT);
    if (chunk === undefined) return false;
    const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
    return (
      (chunk.bits[offset >> ChunkedTileSet.WORD_SHIFT] &
        (1 << (offset & 31))) !==
      0
    );
  }

  delete(value: number): boolean {
    const chunk = this.chunks.get(value >> ChunkedTileSet.CHUNK_SHIFT);
    if (chunk === undefined) return false;

    const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
    const wordIndex = offset >> ChunkedTileSet.WORD_SHIFT;
    const mask = 1 << (offset & 31);
    if ((chunk.bits[wordIndex] & mask) === 0) return false;

    chunk.bits[wordIndex] &= ~mask;
    const storedIndex = chunk.orderIndexes[offset];
    if (storedIndex !== 0) {
      this.order[storedIndex - 1] = ChunkedTileSet.DELETED;
      chunk.orderIndexes[offset] = 0;
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
    let write = 0;
    for (let read = 0; read < this.orderLength; read++) {
      const value = this.order[read];
      if (value === ChunkedTileSet.DELETED) continue;
      next[write] = value;
      const chunk = this.chunks.get(value >> ChunkedTileSet.CHUNK_SHIFT)!;
      const offset = value & (ChunkedTileSet.CHUNK_SIZE - 1);
      chunk.orderIndexes[offset] = write + 1;
      write++;
    }
    this.order = next;
    this.orderLength = write;
  }
}
