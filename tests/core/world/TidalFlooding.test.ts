import { describe, expect, it } from "vitest";
import { WorldMechanicsExecution } from "../../../src/core/execution/WorldMechanicsExecution";
import {
  CYCLE_TICKS,
  threeDWorldCycle,
  TIDAL_REACH_TILES,
  tidalFloodRings,
} from "../../../src/core/world/ThreeDWorldCycle";

/**
 * The night tide should visibly take ground.
 *
 * Seeding only from tiles that touch the ocean floods a single-tile ribbon:
 * on the world map that is 94% of the coastline but under 4% of the land, so
 * the sea rose and then stopped dead at the first row of terrain. The tide now
 * climbs inland over low ground, which is what these tests pin.
 *
 * The grid below is 10 wide: column 0 is ocean, columns 1..8 are low land, and
 * column 9 is high land the tide must never cover.
 */
const WIDTH = 10;
const HEIGHT = 3;
const OCEAN = 0x60; // water, shoreline bit, magnitude 0
const LOW_LAND = 0xc1; // land + shoreline bit, magnitude 1
const HIGH_LAND = 0xd8; // land, magnitude 24

function buildGame() {
  const terrain = new Uint8Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x;
      terrain[i] = x === 0 ? OCEAN : x === WIDTH - 1 ? HIGH_LAND : LOW_LAND;
    }
  }
  const owners = new Uint8Array(WIDTH * HEIGHT).fill(7);

  return {
    terrain,
    owners,
    inSpawnPhase: () => false,
    config: () => ({ worldMechanics: () => ({ threeDMode: true }) }),
    width: () => WIDTH,
    height: () => HEIGHT,
    terrainByte: (ref: number) => terrain[ref],
    setTerrainByte: (ref: number, b: number) => {
      terrain[ref] = b;
    },
    isLand: (ref: number) => (terrain[ref] & 0x80) !== 0,
    hasOwner: (ref: number) => owners[ref] !== 0,
    ownerID: (ref: number) => owners[ref],
    playerBySmallID: () => ({ isPlayer: () => false, isAlive: () => false }),
    isOceanShore: (ref: number) => {
      if ((terrain[ref] & 0x80) === 0) return false;
      const x = ref % WIDTH;
      const y = Math.floor(ref / WIDTH);
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
        if ((terrain[ny * WIDTH + nx] & 0x80) === 0) return true;
      }
      return false;
    },
    neighbors4: (ref: number, out: number[]) => {
      const x = ref % WIDTH;
      const y = Math.floor(ref / WIDTH);
      let n = 0;
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) continue;
        out[n++] = ny * WIDTH + nx;
      }
      return n;
    },
    processDisasterDamageScansNoop: true,
  };
}

function runUntil(game: ReturnType<typeof buildGame>, lastTick: number) {
  const exec = new WorldMechanicsExecution(1);

  exec.init(game as any);
  for (let tick = 0; tick <= lastTick; tick++) exec.tick(tick);
  return exec;
}

function floodedColumns(game: ReturnType<typeof buildGame>): number[] {
  const cols: number[] = [];
  for (let x = 1; x < WIDTH; x++) {
    if ((game.terrain[x] & 0x80) === 0) cols.push(x);
  }
  return cols;
}

describe("night tide reaches inland", () => {
  it("floods past the shoreline over low ground during the night", () => {
    const nightTick = CYCLE_TICKS / 2;
    expect(threeDWorldCycle(nightTick).isNight).toBe(true);

    const game = buildGame();
    runUntil(game, nightTick);

    const flooded = floodedColumns(game);
    // Column 1 is the shoreline; the tide must climb beyond it.
    expect(flooded).toContain(1);
    expect(flooded.length).toBeGreaterThan(1);
  });

  it("never covers high ground", () => {
    const game = buildGame();
    runUntil(game, CYCLE_TICKS / 2);
    // Column 9 is magnitude 24: far above the tide.
    expect(game.terrain[WIDTH - 1] & 0x80).not.toBe(0);
  });

  it("gives the land back when the night ends", () => {
    const game = buildGame();
    const exec = new WorldMechanicsExecution(1);

    exec.init(game as any);
    for (let tick = 0; tick <= CYCLE_TICKS / 2; tick++) exec.tick(tick);
    expect(floodedColumns(game).length).toBeGreaterThan(0);

    // Advance to full daylight and let the restore drain.
    for (let tick = CYCLE_TICKS / 2 + 1; tick <= CYCLE_TICKS; tick++) {
      exec.tick(tick);
    }
    expect(threeDWorldCycle(CYCLE_TICKS).isNight).toBe(false);
    expect(floodedColumns(game)).toEqual([]);
  });
});

// The tide used to be a switch: dusk flooded the whole reach and dawn drained
// all of it. It now follows how deep into the night it is, so the sea takes
// the coast a ring at a time and gives it back the same way.
describe("the tide takes ground gradually", () => {
  it("covers no coast by day and deepens through the night", () => {
    const at = (fraction: number) =>
      tidalFloodRings(Math.round(fraction * CYCLE_TICKS));

    // Noon and the hours either side of it: dry.
    expect(at(0)).toBe(0);
    expect(at(0.2)).toBe(0);
    // Dusk takes the shoreline itself, then it climbs inland.
    expect(at(0.3)).toBe(1);
    expect(at(0.4)).toBeGreaterThan(at(0.3));
    // Deepest at midnight.
    expect(at(0.5)).toBeGreaterThan(at(0.4));
    // ...and falls back symmetrically rather than snapping dry.
    expect(at(0.6)).toBe(at(0.4));
    expect(at(0.7)).toBe(at(0.3));
    expect(at(0.8)).toBe(0);
  });

  it("never reaches further than the coast it was given", () => {
    for (let tick = 0; tick < CYCLE_TICKS; tick += 37) {
      const rings = tidalFloodRings(tick);
      expect(rings).toBeGreaterThanOrEqual(0);
      expect(rings).toBeLessThanOrEqual(TIDAL_REACH_TILES + 1);
    }
  });

  it("floods less at dusk than at the height of the night", () => {
    const duskGame = buildGame();
    runUntil(duskGame, Math.round(CYCLE_TICKS * 0.31));
    const dusk = floodedColumns(duskGame).length;

    const midnightGame = buildGame();
    runUntil(midnightGame, Math.round(CYCLE_TICKS * 0.5));
    const midnight = floodedColumns(midnightGame).length;

    expect(dusk).toBeGreaterThan(0);
    expect(midnight).toBeGreaterThan(dusk);
  });
});
