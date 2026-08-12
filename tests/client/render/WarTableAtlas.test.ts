import { access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  WAR_TABLE_MOBILE_ORDER,
  WAR_TABLE_STRUCTURE_ORDER,
} from "../../../src/client/render/gl/war-table/WarTableMiniatureRegistry";

const root = path.resolve(import.meta.dirname, "../../..");
const CELL = 96;

async function expectCompleteAtlas(
  filename: string,
  expectedCells: number,
): Promise<void> {
  const atlasPath = path.join(root, "resources", "atlases", filename);
  await access(atlasPath);
  const image = sharp(atlasPath).ensureAlpha();
  const metadata = await image.metadata();
  expect(metadata.width).toBe(expectedCells * CELL);
  expect(metadata.height).toBe(CELL);

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let cell = 0; cell < expectedCells; cell++) {
    let opaque = 0;
    let touchesGutter = false;
    for (let y = 0; y < CELL; y++) {
      for (let x = 0; x < CELL; x++) {
        const alpha = data[(y * info.width + cell * CELL + x) * 4 + 3];
        if (alpha > 0) opaque++;
        if (alpha > 0 && (x < 4 || x >= CELL - 4 || y < 4 || y >= CELL - 4)) {
          touchesGutter = true;
        }
      }
    }
    expect(opaque, `atlas cell ${cell} is empty`).toBeGreaterThan(120);
    expect(touchesGutter, `atlas cell ${cell} is clipped`).toBe(false);
  }
}

describe("Living War Table atlases", () => {
  it("contains one unclipped structure miniature per registry entry", async () => {
    await expectCompleteAtlas(
      "war-table-structures.png",
      WAR_TABLE_STRUCTURE_ORDER.length,
    );
  });

  it("contains one unclipped mobile miniature per registry entry", async () => {
    await expectCompleteAtlas(
      "war-table-units.png",
      WAR_TABLE_MOBILE_ORDER.length,
    );
  });
});
