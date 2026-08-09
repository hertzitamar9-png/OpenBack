import type { ThreeDCameraState } from "./ThreeDCamera";

export const THREE_D_TERRAIN_CHUNK_SIZE = 128;
export const THREE_D_TERRAIN_LOD_STEPS = [1, 2, 4, 8] as const;
export type ThreeDTerrainLOD = 0 | 1 | 2 | 3;

export interface TerrainChunkKey {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly worldRight: number;
  readonly worldBottom: number;
  readonly lod: ThreeDTerrainLOD;
}

export interface TileBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class ThreeDLODSelector {
  choose(
    projectedTilePixels: number,
    previous?: ThreeDTerrainLOD,
  ): ThreeDTerrainLOD {
    const pixels = Number.isFinite(projectedTilePixels)
      ? projectedTilePixels
      : 0;
    let desired: ThreeDTerrainLOD = 3;
    if (pixels >= 3) desired = 0;
    else if (pixels >= 1.5) desired = 1;
    else if (pixels >= 0.75) desired = 2;

    if (previous === undefined || previous === desired) return desired;
    const lowerBounds = [3, 1.5, 0.75, 0] as const;
    const upperBounds = [Number.POSITIVE_INFINITY, 3, 1.5, 0.75] as const;
    if (
      pixels >= lowerBounds[previous] * 0.7 &&
      pixels <= upperBounds[previous] * 1.3
    ) {
      return previous;
    }
    return desired;
  }
}

/**
 * Fixed world-coordinate chunk layout. Camera motion only changes which stable
 * chunks are submitted; it never moves or resamples their vertices.
 */
export class ThreeDTerrainChunks {
  private readonly previousLOD = new Map<string, ThreeDTerrainLOD>();
  private readonly dirty = new Set<string>();
  private readonly selector = new ThreeDLODSelector();

  constructor(
    private readonly mapWidth: number,
    private readonly mapHeight: number,
  ) {}

  visible(camera: ThreeDCameraState): readonly TerrainChunkKey[] {
    const safety = THREE_D_TERRAIN_CHUNK_SIZE;
    const frustumBounds = camera.frustum.worldBounds;
    // Keep a conservative target-centered safety rectangle in addition to
    // exact ground-ray bounds. At shallow orbit angles some top-corner rays
    // leave the finite map before touching sea level; they must never cull the
    // terrain directly under the camera target.
    const viewHalfX = camera.distance * camera.tanHalfFov * camera.aspect * 2.2;
    const viewHalfZ = camera.distance * camera.tanHalfFov * 2.2;
    const cosYaw = Math.abs(Math.cos(camera.yaw));
    const sinYaw = Math.abs(Math.sin(camera.yaw));
    const targetExtentX = cosYaw * viewHalfX + sinYaw * viewHalfZ;
    const targetExtentZ = sinYaw * viewHalfX + cosYaw * viewHalfZ;
    const bounds = {
      left: Math.min(frustumBounds.left, camera.center.x - targetExtentX),
      top: Math.min(frustumBounds.top, camera.center.z - targetExtentZ),
      right: Math.max(frustumBounds.right, camera.center.x + targetExtentX),
      bottom: Math.max(frustumBounds.bottom, camera.center.z + targetExtentZ),
    };
    const startX = this.clampChunkOrigin(
      Math.floor((bounds.left - safety) / 128) * 128,
      this.mapWidth,
    );
    const startY = this.clampChunkOrigin(
      Math.floor((bounds.top - safety) / 128) * 128,
      this.mapHeight,
    );
    const endX = Math.min(
      this.mapWidth,
      (Math.floor((bounds.right + safety) / 128) + 1) * 128,
    );
    const endY = Math.min(
      this.mapHeight,
      (Math.floor((bounds.bottom + safety) / 128) + 1) * 128,
    );
    const projectedTilePixels =
      camera.viewportHeight / (2 * camera.distance * camera.tanHalfFov);
    // Every neighboring grid must share the same edge subdivisions. Mixing
    // per-chunk LODs creates T-junctions that expose the dark board base as
    // horizontal or vertical cracks. A frame-wide LOD still scales with zoom:
    // close views retain full detail while distant views stay inexpensive.
    const frameLod = this.selector.choose(
      projectedTilePixels,
      this.previousLOD.get("frame"),
    );
    this.previousLOD.set("frame", frameLod);
    const chunks: TerrainChunkKey[] = [];

    for (let y = startY; y < endY; y += THREE_D_TERRAIN_CHUNK_SIZE) {
      for (let x = startX; x < endX; x += THREE_D_TERRAIN_CHUNK_SIZE) {
        const key = `${x}:${y}`;
        const lod = frameLod;
        this.previousLOD.set(key, lod);
        const worldRight = Math.min(
          this.mapWidth,
          x + THREE_D_TERRAIN_CHUNK_SIZE,
        );
        const worldBottom = Math.min(
          this.mapHeight,
          y + THREE_D_TERRAIN_CHUNK_SIZE,
        );
        chunks.push({
          key,
          x,
          y,
          width: worldRight - x,
          height: worldBottom - y,
          worldRight,
          worldBottom,
          lod,
        });
      }
    }

    return chunks;
  }

  markDirty(bounds: TileBounds): void {
    const left = Math.max(0, Math.floor(bounds.left / 128) * 128);
    const top = Math.max(0, Math.floor(bounds.top / 128) * 128);
    const right = Math.min(
      this.mapWidth - 1,
      Math.max(bounds.left, bounds.right),
    );
    const bottom = Math.min(
      this.mapHeight - 1,
      Math.max(bounds.top, bounds.bottom),
    );
    for (let y = top; y <= bottom; y += 128) {
      for (let x = left; x <= right; x += 128) this.dirty.add(`${x}:${y}`);
    }
  }

  consumeDirty(): string[] {
    const keys = [...this.dirty];
    this.dirty.clear();
    return keys;
  }

  private clampChunkOrigin(value: number, mapSize: number): number {
    if (mapSize <= 0) return 0;
    return Math.max(0, Math.min(Math.floor((mapSize - 1) / 128) * 128, value));
  }

  private balanceNeighbors(chunks: TerrainChunkKey[]): void {
    const byOrigin = new Map(chunks.map((chunk) => [chunk.key, chunk]));
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        let lod = chunk.lod;
        for (const [dx, dy] of [
          [128, 0],
          [-128, 0],
          [0, 128],
          [0, -128],
        ]) {
          const neighbor = byOrigin.get(`${chunk.x + dx}:${chunk.y + dy}`);
          if (neighbor && lod > neighbor.lod + 1)
            lod = (neighbor.lod + 1) as ThreeDTerrainLOD;
        }
        if (lod !== chunk.lod) {
          const next = { ...chunk, lod };
          chunks[index] = next;
          byOrigin.set(next.key, next);
          this.previousLOD.set(next.key, lod);
          changed = true;
        }
      }
      if (!changed) break;
    }
  }
}
