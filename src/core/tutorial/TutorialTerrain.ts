import { GameMapImpl } from "../game/GameMap";
import { TerrainMapData } from "../game/TerrainMapLoader";

export const TUTORIAL_POINTS = {
  home: { x: 145, y: 285 },
  expansion: { x: 220, y: 285 },
  border: { x: 280, y: 260 },
  redoubt: { x: 300, y: 210 },
  factory: { x: 220, y: 355 },
  silo: { x: 145, y: 210 },
  sea: { x: 407, y: 300 },
  harbor: { x: 384, y: 300 },
  landing: { x: 521, y: 225 },
  target: { x: 630, y: 200 },
} as const;

/** Hand-authored coastal ranges, no random seed and no downloaded map assets. */
function elevation(x: number, y: number): number {
  const island = (cx: number, cy: number, rx: number, ry: number) => {
    const angle = Math.atan2((y - cy) / ry, (x - cx) / rx);
    const coast = 1 + 0.045 * Math.sin(angle * 5) + 0.025 * Math.sin(angle * 9);
    return coast - Math.hypot((x - cx) / rx, (y - cy) / ry);
  };
  return Math.max(
    island(215, 275, 163, 180),
    island(620, 225, 108, 130),
    island(438, 425, 49, 31),
    island(440, 70, 40, 24),
  );
}

function makeMap(scale: number): GameMapImpl {
  const width = 768 / scale,
    height = 512 / scale;
  const bytes = new Uint8Array(width * height);
  let land = 0;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const e = elevation(x * scale, y * scale);
      const isLand = e > 0;
      if (isLand) land++;
      // Offset, winding ridges avoid concentric contour bands. Most of the
      // training district stays low and cheap to expand across.
      const wx = x * scale,
        wy = y * scale;
      const ridgeX =
        wx < 390 ? 208 + 22 * Math.sin(wy / 53) : 647 + 14 * Math.sin(wy / 40);
      const ridge =
        Math.exp(-(((wx - ridgeX) / 27) ** 2)) *
        (0.6 + 0.4 * Math.sin(wy / 39) ** 2);
      const magnitude = isLand
        ? Math.min(24, Math.max(0, Math.floor(e * (4 + 20 * ridge))))
        : Math.min(30, Math.floor(-e * 20));
      bytes[y * width + x] = (isLand ? 0x80 : 0x20) | magnitude;
    }
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const ref = y * width + x;
      if (
        [ref - 1, ref + 1, ref - width, ref + width].some(
          (n) => (bytes[n] & 0x80) !== (bytes[ref] & 0x80),
        )
      )
        bytes[ref] |= 0x40;
    }
  return new GameMapImpl(width, height, bytes, land);
}

export function createTutorialTerrain(): TerrainMapData {
  // Do not cache mutable maps: every client and worker needs fresh state.
  return {
    gameMap: makeMap(1),
    miniGameMap: makeMap(2),
    nations: [],
    additionalNations: [],
  };
}
