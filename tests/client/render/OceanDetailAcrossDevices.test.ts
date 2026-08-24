import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The sea has to look the same on a phone as it does on a desktop.
 *
 * It did not. Two separate multipliers dimmed it on a handset: a fade keyed to
 * uZoom -- which is device pixels per tile, so a small screen showing a whole
 * map reads as "zoomed out" no matter what the player did -- and a quality
 * tier that pins a phone below full detail. Together they left the ocean at
 * 0.479 against a desktop's 1.000.
 *
 * Neither multiplier bought any speed. Nothing in the shader branches on
 * quality or on that fade, so every wave, sine and noise lookup runs whatever
 * they are set to: a phone paid the same GPU cost for a worse picture. The sea
 * is now a flat 1.0 everywhere.
 *
 * Land is the opposite case and keeps its fade. Relief and grain are
 * tile-scale: one tile is 0.22 device pixels on a phone and a grain cell 0.44,
 * well under the two pixels per feature that sampling once per pixel needs, so
 * drawing them there is speckle rather than texture. That fade is
 * antialiasing, not a device downgrade, and a desktop never reaches it.
 */
const source = readFileSync(
  resolve(
    process.cwd(),
    "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
  ),
  "utf8",
);

/** The two edges of the `smoothstep(a, b, uZoom)` that follows `marker`. */
function zoomFadeAfter(marker: string): [number, number] {
  const from = source.indexOf(marker);
  if (from < 0) throw new Error(`missing "${marker}" in the shader`);
  const open = source.indexOf("smoothstep(", from) + "smoothstep(".length;
  const close = source.indexOf("uZoom)", open);
  const parts = source
    .slice(open, close)
    .split(",")
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
    .map(Number);
  if (parts.length !== 2) throw new Error(`unreadable zoom fade: ${parts}`);
  return [parts[0], parts[1]];
}

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Camera.fit: zoom is device pixels per tile, at 0.9 of what the canvas holds. */
const fitZoom = (cssWidth: number, dpr: number, mapTiles = 2000) =>
  ((cssWidth * dpr) / mapTiles) * 0.9;

// renderDprForProfile caps a phone near 1.25-1.5 and a desktop at 2.
const PHONE = fitZoom(390, 1.25);
const DESKTOP = fitZoom(1920, 2);
const NYQUIST_PIXELS_PER_FEATURE = 2;

describe("the sea is identical on every device", () => {
  it("scales the water by nothing at all", () => {
    expect(source).toContain("float seaDetail = 1.0;");
  });

  it("uses zoom only to keep the tiny shimmer pixel-sized", () => {
    // Base water, waves, shine, and coastline must remain device-identical.
    // The one exception is the new tiny shimmer's geometry: it divides by
    // zoom specifically so the same effect stays the same screen size.
    const water = source.slice(source.indexOf("float seaDetail"));
    const shimmerCall = "oceanShimmer(world, uMapSize, uTime, uZoom)";
    expect(water).toContain(shimmerCall);
    expect(water.replace(shimmerCall, "")).not.toContain("uZoom");
  });

  it("has no quality dial left to dim it", () => {
    // It only ever multiplied the output. Since no branch reads it, a lower
    // tier cost exactly the same GPU work for a fainter sea.
    expect(source).not.toContain("uQuality");
  });
});

describe("land detail fades only where a pixel cannot hold it", () => {
  const LAND = zoomFadeAfter("float detail =");

  it("is switched off where a tile is smaller than a pixel", () => {
    // 1 tile = 0.22 device pixels here: far under Nyquist.
    expect(PHONE).toBeLessThan(NYQUIST_PIXELS_PER_FEATURE);
    expect(smoothstep(LAND[0], LAND[1], PHONE)).toBeLessThan(0.05);
  });

  it("is fully on once a tile is comfortably larger than a pixel", () => {
    expect(DESKTOP).toBeGreaterThan(NYQUIST_PIXELS_PER_FEATURE / 2);
    expect(smoothstep(LAND[0], LAND[1], DESKTOP)).toBe(1);
  });

  it("completes its fade near one pixel per tile, where the limit is", () => {
    // A threshold far above one pixel per tile would be a device downgrade
    // dressed up as antialiasing, which is the bug this file guards.
    expect(LAND[1]).toBeGreaterThan(0.5);
    expect(LAND[1]).toBeLessThanOrEqual(1.5);
  });
});
