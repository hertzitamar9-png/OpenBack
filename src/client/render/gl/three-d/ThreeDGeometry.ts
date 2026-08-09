export interface ThreeDMeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
}

function finish(
  positions: number[],
  normals: number[],
  indices: number[],
): ThreeDMeshData {
  const xs = positions.filter((_, index) => index % 3 === 0);
  const ys = positions.filter((_, index) => index % 3 === 1);
  const zs = positions.filter((_, index) => index % 3 === 2);
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
    bounds: {
      min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
      max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) },
    },
  };
}

export function box(): ThreeDMeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const faces = [
    [
      [1, 0, 0],
      [
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, -0.5],
      ],
    ],
    [
      [-1, 0, 0],
      [
        [-0.5, -0.5, 0.5],
        [-0.5, -0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [-0.5, 0.5, 0.5],
      ],
    ],
    [
      [0, 1, 0],
      [
        [-0.5, 0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
      ],
    ],
    [
      [0, -1, 0],
      [
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, -0.5, -0.5],
        [-0.5, -0.5, -0.5],
      ],
    ],
    [
      [0, 0, 1],
      [
        [0.5, -0.5, 0.5],
        [-0.5, -0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
      ],
    ],
    [
      [0, 0, -1],
      [
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
      ],
    ],
  ] as const;
  for (const [normal, corners] of faces) {
    const start = positions.length / 3;
    for (const corner of corners) {
      positions.push(...corner);
      normals.push(...normal);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return finish(positions, normals, indices);
}

export function beveledBox(): ThreeDMeshData {
  return extrudedSilhouette(
    [
      [-0.38, -0.5],
      [0.38, -0.5],
      [0.5, -0.38],
      [0.5, 0.38],
      [0.38, 0.5],
      [-0.38, 0.5],
      [-0.5, 0.38],
      [-0.5, -0.38],
    ],
    1,
  );
}

export function cylinder(segments = 16): ThreeDMeshData {
  return radial(false, segments);
}

export function cone(segments = 16): ThreeDMeshData {
  return radial(true, segments);
}

function radial(isCone: boolean, segments: number): ThreeDMeshData {
  const n = Math.max(6, Math.floor(segments));
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < n; index++) {
    const angle = (index * Math.PI * 2) / n;
    const x = Math.cos(angle) * 0.5;
    const z = Math.sin(angle) * 0.5;
    positions.push(x, -0.5, z);
    normals.push(isCone ? x : x * 2, isCone ? 0.5 : 0, isCone ? z : z * 2);
    positions.push(isCone ? 0 : x, 0.5, isCone ? 0 : z);
    normals.push(isCone ? x : x * 2, isCone ? 0.5 : 0, isCone ? z : z * 2);
  }
  for (let index = 0; index < n; index++) {
    const next = (index + 1) % n;
    indices.push(
      index * 2,
      next * 2,
      index * 2 + 1,
      next * 2,
      next * 2 + 1,
      index * 2 + 1,
    );
  }
  const bottom = positions.length / 3;
  positions.push(0, -0.5, 0);
  normals.push(0, -1, 0);
  for (let index = 0; index < n; index++) {
    const angle = (index * Math.PI * 2) / n;
    positions.push(Math.cos(angle) * 0.5, -0.5, Math.sin(angle) * 0.5);
    normals.push(0, -1, 0);
  }
  for (let index = 0; index < n; index++)
    indices.push(bottom, bottom + 1 + ((index + 1) % n), bottom + 1 + index);
  if (!isCone) {
    const top = positions.length / 3;
    positions.push(0, 0.5, 0);
    normals.push(0, 1, 0);
    for (let index = 0; index < n; index++) {
      const angle = (index * Math.PI * 2) / n;
      positions.push(Math.cos(angle) * 0.5, 0.5, Math.sin(angle) * 0.5);
      normals.push(0, 1, 0);
    }
    for (let index = 0; index < n; index++)
      indices.push(top, top + 1 + index, top + 1 + ((index + 1) % n));
  }
  return finish(positions, normals, indices);
}

export function extrudedSilhouette(
  outline: readonly (readonly [number, number])[] = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ],
  depth = 0.2,
): ThreeDMeshData {
  if (outline.length < 3)
    throw new Error("A silhouette needs at least three points");
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const half = Math.max(0.001, Math.abs(depth)) / 2;
  for (const y of [-half, half]) {
    for (const [x, z] of outline) {
      positions.push(x, y, z);
      normals.push(0, y < 0 ? -1 : 1, 0);
    }
  }
  for (let i = 1; i < outline.length - 1; i++) {
    indices.push(0, i + 1, i);
    indices.push(outline.length, outline.length + i, outline.length + i + 1);
  }
  for (let index = 0; index < outline.length; index++) {
    const next = (index + 1) % outline.length;
    const [x0, z0] = outline[index];
    const [x1, z1] = outline[next];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const inv = 1 / Math.max(1e-6, Math.hypot(dx, dz));
    const normal = [dz * inv, 0, -dx * inv] as const;
    const start = positions.length / 3;
    positions.push(x0, -half, z0, x1, -half, z1, x1, half, z1, x0, half, z0);
    for (let vertex = 0; vertex < 4; vertex++) normals.push(...normal);
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return finish(positions, normals, indices);
}

export function wedge(): ThreeDMeshData {
  return extrudedSilhouette(
    [
      [-0.5, -0.42],
      [0.5, -0.18],
      [0.5, 0.18],
      [-0.5, 0.42],
    ],
    0.55,
  );
}

export function wing(): ThreeDMeshData {
  return extrudedSilhouette(
    [
      [-0.5, -0.12],
      [0.46, -0.5],
      [0.5, -0.15],
      [0.5, 0.15],
      [0.46, 0.5],
      [-0.5, 0.12],
    ],
    0.12,
  );
}

export function hull(): ThreeDMeshData {
  return extrudedSilhouette(
    [
      [-0.5, -0.34],
      [0.28, -0.42],
      [0.5, 0],
      [0.28, 0.42],
      [-0.5, 0.34],
    ],
    0.55,
  );
}

export function trackedChassis(): ThreeDMeshData {
  return extrudedSilhouette(
    [
      [-0.5, -0.38],
      [0.34, -0.38],
      [0.5, -0.24],
      [0.5, 0.24],
      [0.34, 0.38],
      [-0.5, 0.38],
    ],
    0.62,
  );
}

export function roof(): ThreeDMeshData {
  return extrudedSilhouette(
    [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0, 0.5],
    ],
    0.8,
  );
}

export function barrel(): ThreeDMeshData {
  return cylinder(12);
}
