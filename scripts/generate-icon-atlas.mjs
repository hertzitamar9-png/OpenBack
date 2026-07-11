// Regenerates resources/atlases/icon-atlas.png used by StructurePass.
//
// The atlas is a single-row grid of 64x64 cells, one column per structure type
// in STRUCTURE_ORDER (see src/client/render/gl/passes/StructurePass.ts):
//   0 City, 1 Port, 2 Factory, 3 DefensePost, 4 SAM, 5 MissileSilo,
//   6 Runway, 7 MANPAD
//
// The original 6 columns (0-5) are preserved byte-for-byte from the existing
// atlas so those structures keep their exact look. Runway and MANPAD (columns
// 6-7) are rasterized from their white SVG icons (the same art used in the
// build bar) so their on-map glyphs match. Only the alpha channel of the glyph
// is used by the shader; the RGB is recolored per player.
//
// Run with:  node scripts/generate-icon-atlas.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const CELL = 64;
const GLYPH_FIT = 44; // max glyph dimension inside a cell (matches existing art)

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlasPath = path.join(root, "resources/atlases/icon-atlas.png");

// New columns to render, in atlas-column order after the preserved set.
const NEW_ICONS = [
  { col: 6, svg: "resources/images/RunwayIconWhite.svg" },
  { col: 7, svg: "resources/images/ManpadIconWhite.svg" },
];

async function renderGlyphCell(svgRelPath) {
  const svg = await readFile(path.join(root, svgRelPath));
  // Rasterize the SVG at high resolution, trim transparent padding, then fit
  // it into GLYPH_FIT preserving aspect ratio and center it in a 64x64 cell.
  const glyph = await sharp(svg, { density: 384 })
    .ensureAlpha()
    .trim()
    .resize(GLYPH_FIT, GLYPH_FIT, {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  return sharp({
    create: {
      width: CELL,
      height: CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  const existing = sharp(atlasPath).ensureAlpha();
  const meta = await existing.metadata();
  const existingCols = Math.round(meta.width / CELL);
  const totalCols = Math.max(existingCols, ...NEW_ICONS.map((i) => i.col + 1));
  const width = totalCols * CELL;

  const existingBuf = await existing.png().toBuffer();

  const composites = [{ input: existingBuf, left: 0, top: 0 }];
  for (const { col, svg } of NEW_ICONS) {
    composites.push({
      input: await renderGlyphCell(svg),
      left: col * CELL,
      top: 0,
    });
  }

  const out = await sharp({
    create: {
      width,
      height: CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();

  await writeFile(atlasPath, out);
  console.log(`Wrote ${atlasPath} (${width}x${CELL}, ${totalCols} cols)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
