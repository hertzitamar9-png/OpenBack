import {
  THREE_D_FOV_DEGREES,
  THREE_D_MAX_TERRAIN_HEIGHT,
  THREE_D_MAX_TILT,
  THREE_D_MIN_TILT,
  threeDCameraDistance,
} from "./ThreeDWorldMath";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  depth: number;
}

export interface Ray {
  origin: Vec3;
  direction: Vec3;
}

export interface ThreeDCameraInput {
  viewportWidth: number;
  viewportHeight: number;
  mapWidth: number;
  mapHeight: number;
  centerX: number;
  centerZ: number;
  zoom: number;
  yaw: number;
  pitch: number;
}

export interface ThreeDFrustum {
  groundCorners: readonly Vec3[];
  worldBounds: Readonly<{
    left: number;
    top: number;
    right: number;
    bottom: number;
  }>;
}

const WORLD_UP: Vec3 = { x: 0, y: 1, z: 0 };

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(a: Vec3, amount: number): Vec3 {
  return { x: a.x * amount, y: a.y * amount, z: a.z * amount };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(a: Vec3): Vec3 {
  const length = Math.hypot(a.x, a.y, a.z);
  if (!Number.isFinite(length) || length < 1e-9) return { x: 0, y: 0, z: -1 };
  return scale(a, 1 / length);
}

function multiply4(a: readonly number[], b: readonly number[]): number[] {
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

function viewMatrix(
  position: Vec3,
  right: Vec3,
  up: Vec3,
  forward: Vec3,
): number[] {
  return [
    right.x,
    up.x,
    -forward.x,
    0,
    right.y,
    up.y,
    -forward.y,
    0,
    right.z,
    up.z,
    -forward.z,
    0,
    -dot(right, position),
    -dot(up, position),
    dot(forward, position),
    1,
  ];
}

function projectionMatrix(
  fovRadians: number,
  aspect: number,
  near: number,
  far: number,
): number[] {
  const f = 1 / Math.tan(fovRadians / 2);
  const range = 1 / (near - far);
  return [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * range,
    -1,
    0,
    0,
    2 * far * near * range,
    0,
  ];
}

export class ThreeDCameraState {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly center: Vec3;
  readonly position: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly distance: number;
  readonly pitch: number;
  readonly yaw: number;
  readonly near: number;
  readonly far: number;
  readonly tanHalfFov: number;
  readonly aspect: number;
  readonly viewProjection: readonly number[];
  readonly frustum: ThreeDFrustum;

  private constructor(input: ThreeDCameraInput) {
    this.viewportWidth = Math.max(1, finite(input.viewportWidth, 1));
    this.viewportHeight = Math.max(1, finite(input.viewportHeight, 1));
    this.mapWidth = Math.max(1, finite(input.mapWidth, 1));
    this.mapHeight = Math.max(1, finite(input.mapHeight, 1));
    this.pitch = Math.min(
      THREE_D_MAX_TILT,
      Math.max(THREE_D_MIN_TILT, finite(input.pitch, THREE_D_MIN_TILT)),
    );
    this.yaw = finite(input.yaw, 0);
    this.distance = threeDCameraDistance(
      this.viewportHeight,
      Math.max(0.01, finite(input.zoom, 1)),
      this.pitch,
    );
    this.center = {
      x: finite(input.centerX, this.mapWidth / 2),
      y: 0,
      z: finite(input.centerZ, this.mapHeight / 2),
    };
    const horizontal = this.distance * Math.cos(this.pitch);
    this.position = {
      x: this.center.x + Math.sin(this.yaw) * horizontal,
      y: this.distance * Math.sin(this.pitch),
      z: this.center.z + Math.cos(this.yaw) * horizontal,
    };
    this.forward = normalize({
      x: this.center.x - this.position.x,
      y: this.center.y - this.position.y,
      z: this.center.z - this.position.z,
    });
    this.right = normalize(cross(this.forward, WORLD_UP));
    this.up = normalize(cross(this.right, this.forward));
    this.aspect = this.viewportWidth / this.viewportHeight;
    this.tanHalfFov = Math.tan((THREE_D_FOV_DEGREES * Math.PI) / 360);
    this.near = Math.max(0.1, this.distance * 0.0005);
    const corners: Vec3[] = [];
    let farthest = 0;
    for (const x of [0, this.mapWidth]) {
      for (const z of [0, this.mapHeight]) {
        for (const y of [-8, THREE_D_MAX_TERRAIN_HEIGHT + 24]) {
          const point = { x, y, z };
          corners.push(point);
          farthest = Math.max(
            farthest,
            Math.hypot(
              x - this.position.x,
              y - this.position.y,
              z - this.position.z,
            ),
          );
        }
      }
    }
    this.far = Math.max(this.near + 1, farthest + 128);
    this.viewProjection = multiply4(
      projectionMatrix(
        (THREE_D_FOV_DEGREES * Math.PI) / 180,
        this.aspect,
        this.near,
        this.far,
      ),
      viewMatrix(this.position, this.right, this.up, this.forward),
    );
    const groundCorners = [
      this.intersectPlane(0, 0, 0),
      this.intersectPlane(this.viewportWidth, 0, 0),
      this.intersectPlane(0, this.viewportHeight, 0),
      this.intersectPlane(this.viewportWidth, this.viewportHeight, 0),
    ].filter((point): point is Vec3 => point !== null);
    this.frustum = {
      groundCorners,
      worldBounds: {
        left: groundCorners.length
          ? Math.min(...groundCorners.map((p) => p.x))
          : 0,
        top: groundCorners.length
          ? Math.min(...groundCorners.map((p) => p.z))
          : 0,
        right: groundCorners.length
          ? Math.max(...groundCorners.map((p) => p.x))
          : this.mapWidth,
        bottom: groundCorners.length
          ? Math.max(...groundCorners.map((p) => p.z))
          : this.mapHeight,
      },
    };
  }

  static create(input: ThreeDCameraInput): ThreeDCameraState {
    return new ThreeDCameraState(input);
  }

  project(world: Vec3): ScreenPoint | null {
    const relative = {
      x: world.x - this.position.x,
      y: world.y - this.position.y,
      z: world.z - this.position.z,
    };
    const depth = dot(relative, this.forward);
    if (!Number.isFinite(depth) || depth <= this.near) return null;
    const ndcX =
      dot(relative, this.right) / (depth * this.tanHalfFov * this.aspect);
    const ndcY = dot(relative, this.up) / (depth * this.tanHalfFov);
    if (!Number.isFinite(ndcX) || !Number.isFinite(ndcY)) return null;
    return {
      x: ((ndcX + 1) * this.viewportWidth) / 2,
      y: ((1 - ndcY) * this.viewportHeight) / 2,
      depth,
    };
  }

  screenRay(screenX: number, screenY: number): Ray {
    const ndcX =
      (finite(screenX, this.viewportWidth / 2) / this.viewportWidth) * 2 - 1;
    const ndcY =
      1 - (finite(screenY, this.viewportHeight / 2) / this.viewportHeight) * 2;
    const direction = normalize(
      add(
        this.forward,
        add(
          scale(this.right, ndcX * this.tanHalfFov * this.aspect),
          scale(this.up, ndcY * this.tanHalfFov),
        ),
      ),
    );
    return { origin: { ...this.position }, direction };
  }

  intersectHeightField(
    screenX: number,
    screenY: number,
    sampleHeight: (x: number, z: number) => number,
  ): Vec3 | null {
    const ray = this.screenRay(screenX, screenY);
    let point = this.intersectRayPlane(ray, 0);
    if (!point) return null;
    for (let iteration = 0; iteration < 4; iteration++) {
      const height = Math.max(
        -8,
        Math.min(
          THREE_D_MAX_TERRAIN_HEIGHT,
          finite(sampleHeight(point.x, point.z), 0),
        ),
      );
      const refined = this.intersectRayPlane(ray, height);
      if (!refined) return null;
      point = refined;
    }
    if (
      !Object.values(point).every(Number.isFinite) ||
      point.x < -128 ||
      point.z < -128 ||
      point.x > this.mapWidth + 128 ||
      point.z > this.mapHeight + 128
    ) {
      return null;
    }
    return point;
  }

  private intersectPlane(
    screenX: number,
    screenY: number,
    height: number,
  ): Vec3 | null {
    return this.intersectRayPlane(this.screenRay(screenX, screenY), height);
  }

  private intersectRayPlane(ray: Ray, height: number): Vec3 | null {
    if (Math.abs(ray.direction.y) < 1e-7) return null;
    const distance = (height - ray.origin.y) / ray.direction.y;
    if (!Number.isFinite(distance) || distance <= this.near) return null;
    return add(ray.origin, scale(ray.direction, distance));
  }
}

/** Column-major mat3 that projects the horizontal world plane through the
 * exact same view-projection matrix as terrain and models. */
export function threeDGroundHomography(
  camera: ThreeDCameraState,
  height = 0,
): Float32Array {
  const m = camera.viewProjection;
  return new Float32Array([
    m[0],
    m[1],
    m[3],
    m[8],
    m[9],
    m[11],
    m[12] + m[4] * height,
    m[13] + m[5] * height,
    m[15] + m[7] * height,
  ]);
}
