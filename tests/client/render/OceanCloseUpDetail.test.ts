import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The sea needs structure at whatever size it is being looked at.
 *
 * Every wave field is written in tiles and uZoom is device pixels per tile, so
 * zooming in magnifies the whole sea along with the map. The broad swell spans
 * about 177 tiles: 39 device pixels across a whole-map view, but roughly 1400
 * once a tile is eight pixels wide. Measured on a real context, the shader
 * produced no light/dark reversal at all across a 512px frame at that zoom --
 * one slow gradient rather than water.
 *
 * A finer octave fades in as the view closes. The base field is untouched, so
 * the sea stays anchored to the map rather than sliding under a zoom, and the
 * zoomed-out view measured identically before and after (13px and 67px).
 */
const source = readFileSync(
  resolve(
    process.cwd(),
    "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
  ),
  "utf8",
);

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Camera.fit: device pixels per tile at 0.9 of what the canvas holds. */
const fitZoom = (cssWidth: number, dpr: number, mapTiles = 2000) =>
  ((cssWidth * dpr) / mapTiles) * 0.9;

describe("close-up sea detail", () => {
  it("gates the finer octave on how far in the view is", () => {
    expect(source).toMatch(/float closeUp = smoothstep\(1\.2, 5\.0, uZoom\);/);
  });

  it("adds the octave to the swell and to the shine", () => {
    expect(source).toMatch(/wave \+= ripple \* [\d.]+ \* closeUp;/);
    expect(source).toMatch(/\* closeUp;\s*\n\s*shine = 1\.0 - shine;/);
  });

  it("leaves a phone showing the whole map exactly as it was", () => {
    // The view the player said already looks right must not move at all.
    const phone = fitZoom(390, 1.25);
    expect(phone).toBeLessThan(1.2);
    expect(smoothstep(1.2, 5.0, phone)).toBe(0);
  });

  it("leaves a desktop showing the whole map essentially as it was", () => {
    // 0.053 of the octave at 1.73 px per tile. Rendering that view measured
    // the same 67px feature size with the octave on and off.
    const desktop = fitZoom(1920, 2);
    expect(smoothstep(1.2, 5.0, desktop)).toBeLessThan(0.08);
  });

  it("is fully on by the time a tile fills five pixels", () => {
    expect(smoothstep(1.2, 5.0, 5)).toBe(1);
    expect(smoothstep(1.2, 5.0, 8)).toBe(1);
  });

  it("keeps the added crests a readable size on screen", () => {
    // The ripple runs at |k| near 0.70 and 0.82 per tile, so a crest spans
    // about 9 and 8 tiles: 70 and 60 device pixels once a tile is 8 wide.
    const wavelength = (kx: number, ky: number) =>
      (2 * Math.PI) / Math.hypot(kx, ky);
    for (const [kx, ky] of [
      [0.62, 0.33],
      [-0.41, 0.71],
    ]) {
      const tiles = wavelength(kx, ky);
      expect(tiles * 8).toBeGreaterThan(40);
      expect(tiles * 8).toBeLessThan(120);
    }
  });
});
