import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

async function sprite(name: string) {
  const input = await readFile(`resources/sprites/${name}.png`);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const occupied: Array<{ x: number; y: number; gray: number }> = [];
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] !== 0) occupied.push({ x, y, gray: data[i] });
    }
  }
  return { data, info, occupied };
}

describe("transport and trade ship artwork", () => {
  it("uses readable, distinct silhouettes within the battlefield atlas cell", async () => {
    const transport = await sprite("transportship");
    const trade = await sprite("tradeship");

    expect(transport.info.width).toBeGreaterThanOrEqual(9);
    expect(transport.info.height).toBeGreaterThanOrEqual(11);
    expect(trade.info.width).toBeGreaterThanOrEqual(11);
    expect(trade.info.height).toBeGreaterThanOrEqual(11);
    expect(trade.occupied.length).toBeGreaterThan(transport.occupied.length);
    expect(Buffer.from(transport.data).equals(Buffer.from(trade.data))).toBe(
      false,
    );
  });

  it("keeps the exact three grayscale ownership bands", async () => {
    for (const name of ["transportship", "tradeship"]) {
      const image = await sprite(name);
      const colors = new Set(image.occupied.map(({ gray }) => gray));
      expect([...colors].sort((a, b) => a - b)).toEqual([70, 130, 180]);
    }
  });
});
