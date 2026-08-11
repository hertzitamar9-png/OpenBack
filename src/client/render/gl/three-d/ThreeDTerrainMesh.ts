export interface ThreeDTerrainMeshData {
  positions: Float32Array;
  indices: Uint32Array;
}

export function buildTerrainGrid(
  segmentsX: number,
  segmentsY: number,
): ThreeDTerrainMeshData {
  const sx = Math.max(1, Math.floor(segmentsX));
  const sy = Math.max(1, Math.floor(segmentsY));
  const positions = new Float32Array((sx + 1) * (sy + 1) * 2);
  let vertex = 0;
  for (let y = 0; y <= sy; y++) {
    for (let x = 0; x <= sx; x++) {
      positions[vertex++] = x / sx;
      positions[vertex++] = y / sy;
    }
  }
  const indices = new Uint32Array(sx * sy * 6);
  let index = 0;
  for (let y = 0; y < sy; y++) {
    for (let x = 0; x < sx; x++) {
      const a = y * (sx + 1) + x;
      const b = a + 1;
      const c = a + sx + 1;
      const d = c + 1;
      indices[index++] = a;
      indices[index++] = c;
      indices[index++] = b;
      indices[index++] = b;
      indices[index++] = c;
      indices[index++] = d;
    }
  }
  return { positions, indices };
}

export function buildWaterGrid(
  width: number,
  height: number,
  segmentsX: number,
  segmentsY: number,
  waterHeight: number,
): ThreeDTerrainMeshData {
  const sx = Math.max(1, Math.floor(segmentsX));
  const sy = Math.max(1, Math.floor(segmentsY));
  const positions = new Float32Array((sx + 1) * (sy + 1) * 3);
  let vertex = 0;
  for (let y = 0; y <= sy; y++) {
    for (let x = 0; x <= sx; x++) {
      positions[vertex++] = (x / sx) * width;
      positions[vertex++] = waterHeight;
      positions[vertex++] = (y / sy) * height;
    }
  }
  const indices = new Uint32Array(sx * sy * 6);
  let index = 0;
  for (let y = 0; y < sy; y++) {
    for (let x = 0; x < sx; x++) {
      const a = y * (sx + 1) + x;
      const b = a + 1;
      const c = a + sx + 1;
      const d = c + 1;
      indices[index++] = a;
      indices[index++] = c;
      indices[index++] = b;
      indices[index++] = b;
      indices[index++] = c;
      indices[index++] = d;
    }
  }
  return { positions, indices };
}

export function terrainEdgeCoordinates(
  originX: number,
  originY: number,
  width: number,
  height: number,
  step: number,
  edge: "left" | "right" | "top" | "bottom",
): number[] {
  const length = edge === "left" || edge === "right" ? height : width;
  const origin = edge === "left" || edge === "right" ? originY : originX;
  const safeStep = Math.max(1, Math.floor(step));
  const values: number[] = [];
  for (let offset = 0; offset < length; offset += safeStep)
    values.push(origin + offset);
  values.push(origin + length);
  return values;
}

export function buildSolidMapBase(
  width: number,
  height: number,
  top = -1.5,
  bottom = -40,
): ThreeDTerrainMeshData {
  const positions = new Float32Array([
    0,
    top,
    0,
    width,
    top,
    0,
    width,
    top,
    height,
    0,
    top,
    height,
    0,
    bottom,
    0,
    width,
    bottom,
    0,
    width,
    bottom,
    height,
    0,
    bottom,
    height,
  ]);
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2,
    3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ]);
  return { positions, indices };
}

export function buildCompleteMapSurface(
  width: number,
  height: number,
  waterHeight = -0.08,
  bottom = -40,
): {
  water: ThreeDTerrainMeshData;
  base: ThreeDTerrainMeshData;
} {
  const water = buildWaterGrid(width, height, 192, 96, waterHeight);
  return {
    water,
    base: buildSolidMapBase(width, height, waterHeight - 0.92, bottom),
  };
}

/**
 * Four vertical strips joining the sampled terrain boundary to the board base.
 * The Y component is a top/bottom selector; the GPU resolves top vertices from
 * the live terrain texture so irregular edges such as Antarctica stay closed.
 */
export function buildMapEdgeSkirt(
  width: number,
  height: number,
  segmentsX = 192,
  segmentsY = 96,
): ThreeDTerrainMeshData {
  const positions: number[] = [];
  const indices: number[] = [];
  const addEdge = (
    segments: number,
    point: (t: number) => readonly [number, number],
  ) => {
    const start = positions.length / 3;
    for (let index = 0; index <= segments; index++) {
      const [x, z] = point(index / segments);
      positions.push(x, 1, z, x, 0, z);
    }
    for (let index = 0; index < segments; index++) {
      const current = start + index * 2;
      const next = current + 2;
      indices.push(current, current + 1, next + 1, current, next + 1, next);
    }
  };

  addEdge(segmentsX, (t) => [t * width, 0]);
  addEdge(segmentsX, (t) => [(1 - t) * width, height]);
  addEdge(segmentsY, (t) => [0, (1 - t) * height]);
  addEdge(segmentsY, (t) => [width, t * height]);
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
