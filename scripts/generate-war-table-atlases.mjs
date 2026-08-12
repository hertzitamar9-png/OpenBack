import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const CELL = 96;
const FIT = 84;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const atlases = [
  {
    output: "resources/atlases/war-table-structures.png",
    directory: "resources/sprites/war-table/structures",
    files: [
      "city.svg",
      "port.svg",
      "factory.svg",
      "defense-post.svg",
      "sam-launcher.svg",
      "missile-silo.svg",
      "runway.svg",
      "manpad.svg",
      "military-base.svg",
      "tank-mine.svg",
    ],
  },
  {
    output: "resources/atlases/war-table-units.png",
    directory: "resources/sprites/war-table/units",
    files: [
      "transport.svg",
      "trade-ship.svg",
      "warship.svg",
      "atom-bomb.svg",
      "hydrogen-bomb.svg",
      "mirv.svg",
      "sam-missile.svg",
      "shell.svg",
      "mirv-warhead.svg",
      "train.svg",
      "plane.svg",
      "tank.svg",
    ],
  },
];

async function renderCell(filename) {
  await access(filename);
  const fitted = await sharp(filename, { density: 384 })
    .ensureAlpha()
    .trim()
    .resize(FIT, FIT, {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const metadata = await sharp(fitted).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Miniature source rendered empty: ${filename}`);
  }
  return sharp({
    create: {
      width: CELL,
      height: CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted, gravity: "center" }])
    .png()
    .toBuffer();
}

async function generate(atlas) {
  const cells = await Promise.all(
    atlas.files.map((file) =>
      renderCell(path.join(root, atlas.directory, file)),
    ),
  );
  const output = path.join(root, atlas.output);
  await mkdir(path.dirname(output), { recursive: true });
  const image = await sharp({
    create: {
      width: cells.length * CELL,
      height: CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      cells.map((input, index) => ({ input, left: index * CELL, top: 0 })),
    )
    .png()
    .toBuffer();
  await writeFile(output, image);
  console.log(`Wrote ${atlas.output} (${cells.length} cells)`);
}

for (const atlas of atlases) await generate(atlas);
