export interface ParsedGlbMesh {
  /** Interleaved position and normal values. */
  vertices: number[];
  indices: number[];
}

type GltfAccessor = {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
};
type GltfBufferView = {
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
};
type GltfPrimitive = {
  attributes?: Record<string, number>;
  indices?: number;
  mode?: number;
};
type GltfNode = {
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
};
type GltfDocument = {
  accessors?: GltfAccessor[];
  bufferViews?: GltfBufferView[];
  meshes?: Array<{ primitives?: GltfPrimitive[] }>;
  nodes?: GltfNode[];
  scenes?: Array<{ nodes?: number[] }>;
  scene?: number;
};

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) {
        out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
      }
    }
  }
  return out;
}

function nodeMatrix(node: GltfNode): number[] {
  if (node.matrix?.length === 16) return [...node.matrix];
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2;
  const yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  const wx = w * x2,
    wy = w * y2,
    wz = w * z2;
  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

function transformPoint(m: number[], x: number, y: number, z: number) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

function transformNormal(m: number[], x: number, y: number, z: number) {
  const nx = m[0] * x + m[4] * y + m[8] * z;
  const ny = m[1] * x + m[5] * y + m[9] * z;
  const nz = m[2] * x + m[6] * y + m[10] * z;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

function componentSize(type: number): number {
  if (type === 5120 || type === 5121) return 1;
  if (type === 5122 || type === 5123) return 2;
  if (type === 5125 || type === 5126) return 4;
  throw new Error(`unsupported component type ${type}`);
}

function componentCount(type: string): number {
  const count = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type];
  if (!count) throw new Error(`unsupported accessor type ${type}`);
  return count;
}

function readComponent(view: DataView, offset: number, type: number): number {
  if (type === 5120) return view.getInt8(offset);
  if (type === 5121) return view.getUint8(offset);
  if (type === 5122) return view.getInt16(offset, true);
  if (type === 5123) return view.getUint16(offset, true);
  if (type === 5125) return view.getUint32(offset, true);
  if (type === 5126) return view.getFloat32(offset, true);
  throw new Error(`unsupported component type ${type}`);
}

function accessorValues(
  document: GltfDocument,
  binary: DataView,
  accessorIndex: number,
): number[] {
  const accessor = document.accessors?.[accessorIndex];
  if (!accessor || accessor.bufferView === undefined) {
    throw new Error(`missing accessor ${accessorIndex}`);
  }
  const bufferView = document.bufferViews?.[accessor.bufferView];
  if (!bufferView)
    throw new Error(`missing buffer view ${accessor.bufferView}`);
  const components = componentCount(accessor.type);
  const size = componentSize(accessor.componentType);
  const stride = bufferView.byteStride ?? components * size;
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const values: number[] = [];
  for (let item = 0; item < accessor.count; item++) {
    const itemOffset = start + item * stride;
    for (let component = 0; component < components; component++) {
      values.push(
        readComponent(
          binary,
          itemOffset + component * size,
          accessor.componentType,
        ),
      );
    }
  }
  return values;
}

/** Parses the mesh portions needed by OpenBack's instanced WebGL renderer. */
export function parseGlbMesh(
  buffer: ArrayBuffer,
  assetName: string,
): ParsedGlbMesh {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) {
      throw new Error("invalid GLB header");
    }
    if (view.getUint32(4, true) !== 2) throw new Error("GLB version is not 2");
    const declaredLength = view.getUint32(8, true);
    if (declaredLength > view.byteLength) throw new Error("truncated GLB");
    let offset = 12;
    let document: GltfDocument | undefined;
    let binary: DataView | undefined;
    while (offset + 8 <= declaredLength) {
      const length = view.getUint32(offset, true);
      const type = view.getUint32(offset + 4, true);
      offset += 8;
      if (offset + length > declaredLength)
        throw new Error("truncated GLB chunk");
      if (type === JSON_CHUNK) {
        const text = new TextDecoder().decode(
          new Uint8Array(buffer, offset, length),
        );
        document = JSON.parse(text.trim()) as GltfDocument;
      } else if (type === BIN_CHUNK) {
        binary = new DataView(buffer, offset, length);
      }
      offset += length;
    }
    if (!document || !binary) throw new Error("missing JSON or binary chunk");

    const vertices: number[] = [];
    const indices: number[] = [];
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const visited = new Set<number>();
    const visit = (nodeIndex: number, parent: number[]) => {
      if (visited.has(nodeIndex)) return;
      visited.add(nodeIndex);
      const node = document!.nodes?.[nodeIndex];
      if (!node) throw new Error(`missing node ${nodeIndex}`);
      const world = multiply(parent, nodeMatrix(node));
      if (node.mesh !== undefined) {
        const mesh = document!.meshes?.[node.mesh];
        if (!mesh) throw new Error(`missing mesh ${node.mesh}`);
        for (const primitive of mesh.primitives ?? []) {
          if ((primitive.mode ?? 4) !== 4) continue;
          const positionIndex = primitive.attributes?.POSITION;
          if (positionIndex === undefined) continue;
          const positions = accessorValues(document!, binary!, positionIndex);
          const normalIndex = primitive.attributes?.NORMAL;
          const normals =
            normalIndex === undefined
              ? null
              : accessorValues(document!, binary!, normalIndex);
          const base = vertices.length / 6;
          for (let i = 0; i < positions.length; i += 3) {
            const p = transformPoint(
              world,
              positions[i],
              positions[i + 1],
              positions[i + 2],
            );
            const n = normals
              ? transformNormal(
                  world,
                  normals[i],
                  normals[i + 1],
                  normals[i + 2],
                )
              : transformNormal(world, 0, 1, 0);
            vertices.push(...p, ...n);
          }
          const local =
            primitive.indices === undefined
              ? Array.from({ length: positions.length / 3 }, (_, i) => i)
              : accessorValues(document!, binary!, primitive.indices);
          for (const index of local) indices.push(base + index);
        }
      }
      for (const child of node.children ?? []) visit(child, world);
    };
    const scene = document.scenes?.[document.scene ?? 0];
    const roots =
      scene?.nodes ?? document.nodes?.map((_, index) => index) ?? [];
    for (const root of roots) visit(root, identity);
    if (vertices.length === 0 || indices.length === 0)
      throw new Error("no triangles");

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;
    for (let i = 0; i < vertices.length; i += 6) {
      minX = Math.min(minX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]);
      maxX = Math.max(maxX, vertices[i]);
      maxY = Math.max(maxY, vertices[i + 1]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ) || 1;
    for (let i = 0; i < vertices.length; i += 6) {
      vertices[i] = (vertices[i] - cx) / extent;
      vertices[i + 1] = (vertices[i + 1] - minY) / extent;
      vertices[i + 2] = (vertices[i + 2] - cz) / extent;
    }
    if (vertices.length / 6 > 65535)
      throw new Error("mesh exceeds 16-bit vertex limit");
    return { vertices, indices };
  } catch (error) {
    const wrapped = new Error(
      `${assetName}: ${error instanceof Error ? error.message : String(error)}`,
    );
    (wrapped as Error & { cause: unknown }).cause = error;
    throw wrapped;
  }
}
