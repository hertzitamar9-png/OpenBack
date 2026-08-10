import { threeDHeightForTerrainByte } from "./ThreeDWorldMath";

export const THREE_D_WATER_HEIGHT = -0.08;

export type ThreeDAltitudeMode = "ground" | "water" | "flight" | "trajectory";

export interface ThreeDSurfacePoint {
  x: number;
  z: number;
}

export interface ThreeDSurfaceNormal {
  x: number;
  y: number;
  z: number;
}

export interface ThreeDSurfaceSupport {
  height: number;
  normal: ThreeDSurfaceNormal;
}

export class ThreeDSurfaceSampler {
  constructor(
    readonly width: number,
    readonly height: number,
    private readonly terrainByteAt: (x: number, z: number) => number,
  ) {}

  heightAt(x: number, z: number): number {
    const px = this.clamp(x - 0.5, this.width);
    const pz = this.clamp(z - 0.5, this.height);
    const x0 = Math.floor(px);
    const z0 = Math.floor(pz);
    const x1 = Math.min(this.width - 1, x0 + 1);
    const z1 = Math.min(this.height - 1, z0 + 1);
    const tx = this.smoothstep(px - x0);
    const tz = this.smoothstep(pz - z0);
    const h00 = this.sample(x0, z0);
    const h10 = this.sample(x1, z0);
    const h01 = this.sample(x0, z1);
    const h11 = this.sample(x1, z1);
    const top = h00 + (h10 - h00) * tx;
    const bottom = h01 + (h11 - h01) * tx;
    const center = top + (bottom - top) * tz;
    const radius = 1.5;
    const sampleOffset = (dx: number, dz: number) =>
      this.sample(Math.floor(px + dx), Math.floor(pz + dz));
    const cardinals =
      sampleOffset(radius, 0) +
      sampleOffset(-radius, 0) +
      sampleOffset(0, radius) +
      sampleOffset(0, -radius);
    const diagonals =
      sampleOffset(radius, radius) +
      sampleOffset(radius, -radius) +
      sampleOffset(-radius, radius) +
      sampleOffset(-radius, -radius);
    return (center * 8 + cardinals * 2 + diagonals) / 20;
  }

  normalAt(x: number, z: number): ThreeDSurfaceNormal {
    const dx = this.heightAt(x + 1, z) - this.heightAt(x - 1, z);
    const dz = this.heightAt(x, z + 1) - this.heightAt(x, z - 1);
    const nx = -dx * 0.5;
    const ny = 1;
    const nz = -dz * 0.5;
    const length = Math.hypot(nx, ny, nz) || 1;
    return { x: nx / length, y: ny / length, z: nz / length };
  }

  supportAt(points: readonly ThreeDSurfacePoint[]): ThreeDSurfaceSupport {
    if (points.length === 0) {
      return { height: 0, normal: { x: 0, y: 1, z: 0 } };
    }
    const heights = points.map((point) => this.heightAt(point.x, point.z));
    heights.sort((a, b) => a - b);
    const middle = Math.floor(heights.length / 2);
    const height =
      heights.length % 2 === 0
        ? (heights[middle - 1] + heights[middle]) / 2
        : heights[middle];
    const center = points.reduce(
      (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
      { x: 0, z: 0 },
    );
    return {
      height,
      normal: this.normalAt(center.x / points.length, center.z / points.length),
    };
  }

  altitudeFor(
    mode: ThreeDAltitudeMode,
    x: number,
    z: number,
    explicitAltitude: number,
  ): number {
    if (mode === "water") return THREE_D_WATER_HEIGHT + explicitAltitude;
    if (mode === "trajectory") return explicitAltitude;
    return this.heightAt(x, z) + explicitAltitude;
  }

  private sample(x: number, z: number): number {
    return threeDHeightForTerrainByte(
      this.terrainByteAt(
        Math.floor(this.clamp(x, this.width)),
        Math.floor(this.clamp(z, this.height)),
      ),
    );
  }

  private smoothstep(value: number): number {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }

  private clamp(value: number, size: number): number {
    if (size <= 1) return 0;
    return Math.max(0, Math.min(size - 1, Number.isFinite(value) ? value : 0));
  }
}
