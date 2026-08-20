import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("resources/maps");
sharp.cache(false);
sharp.concurrency(1);

async function writeOutput(file, data) {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      await writeFile(file, data);
      return;
    } catch (error) {
      if (attempt === 7) throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
}

function classicColor(tile) {
  if (tile === 0x9f) return [0, 0, 0, 0];
  const land = (tile & 0x80) !== 0;
  const shoreline = (tile & 0x40) !== 0;
  const magnitude = tile & 0x1f;
  if (!land) return [0, 0, 0, 0];
  if (shoreline) return [204, 203, 158, 255];
  if (magnitude < 10) return [190, 220 - 2 * magnitude, 138, 255];
  if (magnitude < 20) {
    return [200 + 2 * magnitude, 183 + 2 * magnitude, 138 + 2 * magnitude, 255];
  }
  const value = Math.floor(230 + magnitude / 2);
  return [value, value, value, 255];
}

function render(data, width, height, relief) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const tile = data[index];
      const color = classicColor(tile);
      if (relief && color[3] !== 0) {
        const left = data[y * width + Math.max(0, x - 1)] & 0x1f;
        const right = data[y * width + Math.min(width - 1, x + 1)] & 0x1f;
        const up = data[Math.max(0, y - 1) * width + x] & 0x1f;
        const down = data[Math.min(height - 1, y + 1) * width + x] & 0x1f;
        const light = Math.max(
          0.68,
          Math.min(1.22, 1 + (left - right + up - down) * 0.026),
        );
        color[0] = Math.min(255, Math.round(color[0] * light));
        color[1] = Math.min(255, Math.round(color[1] * light));
        color[2] = Math.min(255, Math.round(color[2] * light));
      }
      rgba.set(color, index * 4);
    }
  }
  return rgba;
}

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = path.join(root, entry.name);
  let manifest;
  let terrain;
  try {
    manifest = JSON.parse(
      await readFile(path.join(directory, "manifest.json"), "utf8"),
    );
    terrain = await readFile(path.join(directory, "map4x.bin"));
  } catch {
    continue;
  }
  const width = manifest.map4x.width;
  const height = manifest.map4x.height;
  if (terrain.length !== width * height) continue;

  for (const [suffix, relief] of [
    ["", false],
    ["-3d", true],
  ]) {
    const raw = render(terrain, width, height, relief);
    const image = sharp(raw, { raw: { width, height, channels: 4 } });
    const large = await image
      .clone()
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    await writeOutput(
      path.join(directory, `thumbnail${suffix}@2x.webp`),
      large,
    );
    const small = await image
      .clone()
      .resize(
        Math.max(1, Math.floor(width / 2)),
        Math.max(1, Math.floor(height / 2)),
        {
          kernel: sharp.kernel.lanczos3,
        },
      )
      .webp({ quality: 88, effort: 5 })
      .toBuffer();
    await writeOutput(path.join(directory, `thumbnail${suffix}.webp`), small);
  }
}
