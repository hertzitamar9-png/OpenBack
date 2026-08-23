import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The sea looked flat and dark on a phone while reading correctly on a desktop.
 *
 * `uZoom` is device pixels per tile, not "how far the player has zoomed in".
 * A phone showing a whole map sits near 0.22 and a desktop showing the same map
 * near 1.7, so thresholds chosen against a desktop's numbers held the
 * zoomed-out fade permanently on for handsets: land relief measured 0.000 there
 * against 1.000 on a monitor, and the sea kept less than half its shine.
 *
 * The crests are 6 to 77 device pixels wide at a phone's zoom, so this was
 * never a case of detail too fine to draw -- the fade was simply tuned past
 * where phones live. These assertions pin the thresholds to the devices they
 * have to serve, by running the shader's own arithmetic.
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
  const call = source.indexOf("smoothstep(", from);
  const open = call + "smoothstep(".length;
  const close = source.indexOf("uZoom)", open);
  if (call < 0 || close < 0) throw new Error(`no zoom fade after "${marker}"`);
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

const LAND_FADE = zoomFadeAfter("float detail =");
const SEA_FADE = zoomFadeAfter("float seaDetail =");

// WarTableQualityController pins a handset to tier 1 and never lets it back to
// tier 0, so 0.78 is the best quality available there.
const PHONE_QUALITY = 0.78;

const seaDetail = (zoom: number, quality: number) =>
  (0.6 + 0.4 * smoothstep(SEA_FADE[0], SEA_FADE[1], zoom)) *
  Math.min(1, Math.max(0.45, quality));

const landDetail = (zoom: number, quality: number) =>
  smoothstep(LAND_FADE[0], LAND_FADE[1], zoom) *
  Math.min(1, Math.max(0.45, quality));

describe("ocean and terrain detail on the device that shows it", () => {
  it("keeps most of the sea's shine on a phone", () => {
    const phone = seaDetail(PHONE, PHONE_QUALITY);
    const desktop = seaDetail(DESKTOP, 1);

    expect(desktop).toBeCloseTo(1, 5);
    // It was 0.479 -- less than half the desktop's sea.
    expect(phone).toBeGreaterThan(0.7);
    // The quality tier is a deliberate cost decision; the zoom fade must not
    // take a second bite out of what that tier already allows.
    expect(phone / PHONE_QUALITY).toBeGreaterThan(0.9);
  });

  it("still shades the land on a phone", () => {
    expect(landDetail(DESKTOP, 1)).toBeCloseTo(1, 5);
    // Relief and grain were switched off outright on a phone: exactly 0.
    expect(landDetail(PHONE, PHONE_QUALITY)).toBeGreaterThan(0.15);
  });

  it("leaves a desktop exactly as it was", () => {
    expect(smoothstep(SEA_FADE[0], SEA_FADE[1], DESKTOP)).toBe(1);
    expect(smoothstep(LAND_FADE[0], LAND_FADE[1], DESKTOP)).toBe(1);
  });

  it("reaches full detail inside the zoom range the camera allows", () => {
    // Camera clamps zoom to [0.2, 20]. A fade that only completes above the
    // zoom a phone can reach is the bug this file exists for.
    expect(SEA_FADE[1]).toBeLessThanOrEqual(0.3);
    expect(LAND_FADE[1]).toBeLessThanOrEqual(0.5);
    expect(seaDetail(0.2, PHONE_QUALITY) / PHONE_QUALITY).toBeGreaterThan(0.85);
  });
});
