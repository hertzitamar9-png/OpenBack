export type WarTableTerrainKind =
  | "water"
  | "shore-water"
  | "sand"
  | "plains"
  | "highland"
  | "mountain"
  | "peak";

export interface WarTableTerrainMaterial {
  kind: WarTableTerrainKind;
  relief: number;
  grain: number;
  shore: number;
}

export function classifyWarTableTerrain(
  terrainByte: number,
): WarTableTerrainMaterial {
  const land = (terrainByte & 0x80) !== 0;
  const shoreline = (terrainByte & 0x40) !== 0;
  const magnitude = terrainByte & 0x1f;

  if (!land) {
    return {
      kind: shoreline ? "shore-water" : "water",
      relief: 0,
      grain: 0.12,
      shore: shoreline ? 1 : 0,
    };
  }
  if (magnitude === 31) {
    return { kind: "peak", relief: 1, grain: 0.35, shore: 0 };
  }
  if (shoreline) {
    return { kind: "sand", relief: 0.12, grain: 0.18, shore: 1 };
  }
  if (magnitude < 10) {
    return {
      kind: "plains",
      relief: 0.14 + magnitude * 0.018,
      grain: 0.22,
      shore: 0,
    };
  }
  if (magnitude < 20) {
    return {
      kind: "highland",
      relief: 0.34 + (magnitude - 10) * 0.028,
      grain: 0.28,
      shore: 0,
    };
  }
  return {
    kind: "mountain",
    relief: 0.65 + (magnitude - 20) * 0.035,
    grain: 0.32,
    shore: 0,
  };
}

export function warTableTerrainDetail(zoom: number): number {
  if (zoom <= 0.35) return 0;
  if (zoom >= 1.15) return 1;
  return (zoom - 0.35) / 0.8;
}
