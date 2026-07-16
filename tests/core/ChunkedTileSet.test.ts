import { describe, expect, it } from "vitest";
import { ChunkedTileSet } from "../../src/core/game/ChunkedTileSet";

describe("ChunkedTileSet", () => {
  it("matches Set add, has, delete, size, and iteration behavior", () => {
    const tiles = new ChunkedTileSet();
    const values = [0, 1, 31, 32, 1023, 1024, 65_535, 12_345_678];

    for (const value of values) {
      expect(tiles.add(value)).toBe(tiles);
      tiles.add(value);
    }

    expect(tiles.size).toBe(values.length);
    for (const value of values) expect(tiles.has(value)).toBe(true);
    expect(tiles.has(999)).toBe(false);
    expect(new Set(tiles)).toEqual(new Set(values));

    expect(tiles.delete(1024)).toBe(true);
    expect(tiles.delete(1024)).toBe(false);
    expect(tiles.has(1024)).toBe(false);
    expect(tiles.size).toBe(values.length - 1);
  });

  it("supports forEach, entries, and clear", () => {
    const tiles = new ChunkedTileSet();
    tiles.add(7).add(2048).add(2049);

    const visited: number[] = [];
    tiles.forEach((value, duplicate, set) => {
      expect(value).toBe(duplicate);
      expect(set).toBe(tiles);
      visited.push(value);
    });

    expect(new Set(visited)).toEqual(new Set([7, 2048, 2049]));
    expect(Array.from(tiles.entries())).toEqual(
      Array.from(tiles).map((value) => [value, value]),
    );

    tiles.clear();
    expect(tiles.size).toBe(0);
    expect(Array.from(tiles)).toEqual([]);
  });

  it("preserves Set insertion order after deletion and reinsertion", () => {
    const tiles = new ChunkedTileSet();
    tiles.add(2048).add(1).add(1024).add(33);
    expect(Array.from(tiles)).toEqual([2048, 1, 1024, 33]);

    tiles.delete(1);
    expect(Array.from(tiles)).toEqual([2048, 1024, 33]);

    tiles.add(1);
    expect(Array.from(tiles)).toEqual([2048, 1024, 33, 1]);
  });

  it("keeps lazy reverse indexes correct across repeated ownership churn", () => {
    const tiles = new ChunkedTileSet();
    const values = [1, 33, 1024, 2048, 4097];
    values.forEach((tile) => tiles.add(tile));

    expect(tiles.delete(33)).toBe(true);
    tiles.add(33);
    expect(tiles.delete(1)).toBe(true);
    tiles.add(1);
    expect(tiles.delete(33)).toBe(true);

    expect(Array.from(tiles)).toEqual([1024, 2048, 4097, 1]);
    expect(tiles.size).toBe(4);
    expect(tiles.has(33)).toBe(false);
  });
});
