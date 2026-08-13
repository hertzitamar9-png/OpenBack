import {
  ScreenPoint,
  ThreeDCameraInput,
  ThreeDCameraState,
  Vec3,
} from "./ThreeDCamera";
import { ThreeDSurfaceSampler } from "./ThreeDSurfaceSampler";

export interface ThreeDWorldFrameInput extends ThreeDCameraInput {
  terrainByteAt: (x: number, z: number) => number;
}

/**
 * One immutable description of a rendered 3D frame. Input, overlays and
 * terrain rendering use this contract so they cannot disagree about camera
 * matrices or the smoothed surface under a pointer.
 */
export class ThreeDWorldFrame {
  readonly camera: ThreeDCameraState;
  readonly surface: ThreeDSurfaceSampler;

  private constructor(input: ThreeDWorldFrameInput) {
    this.camera = ThreeDCameraState.create(input);
    this.surface = new ThreeDSurfaceSampler(
      input.mapWidth,
      input.mapHeight,
      input.terrainByteAt,
    );
  }

  static create(input: ThreeDWorldFrameInput): ThreeDWorldFrame {
    return new ThreeDWorldFrame(input);
  }

  surfaceHeight(x: number, z: number): number {
    return this.surface.heightAt(x, z);
  }

  projectWorld(x: number, z: number, altitude = 0): ScreenPoint | null {
    return this.camera.project({
      x,
      y: this.surfaceHeight(x, z) + altitude,
      z,
    });
  }

  intersectTerrain(screenX: number, screenY: number): Vec3 | null {
    const ray = this.camera.screenRay(screenX, screenY);
    const at = (distance: number): Vec3 => ({
      x: ray.origin.x + ray.direction.x * distance,
      y: ray.origin.y + ray.direction.y * distance,
      z: ray.origin.z + ray.direction.z * distance,
    });
    let previousDistance = this.camera.near;
    const previous = at(previousDistance);
    let previousDelta = previous.y - this.surfaceHeight(previous.x, previous.z);
    let point: Vec3 | null = null;
    // Ray marching brackets the first terrain crossing. Binary refinement then
    // resolves steep mountain faces without the oscillation produced by
    // repeatedly intersecting horizontal planes at discontinuous heights.
    for (let step = 1; step <= 96; step++) {
      const distance =
        this.camera.near + ((this.camera.far - this.camera.near) * step) / 96;
      const current = at(distance);
      const delta = current.y - this.surfaceHeight(current.x, current.z);
      if (previousDelta >= 0 && delta <= 0) {
        let low = previousDistance;
        let high = distance;
        for (let iteration = 0; iteration < 20; iteration++) {
          const middle = (low + high) / 2;
          const candidate = at(middle);
          const candidateDelta =
            candidate.y - this.surfaceHeight(candidate.x, candidate.z);
          if (candidateDelta > 0) low = middle;
          else high = middle;
        }
        point = at((low + high) / 2);
        break;
      }
      previousDistance = distance;
      previousDelta = delta;
    }
    if (
      !point ||
      point.x < 0 ||
      point.z < 0 ||
      point.x >= this.surface.width ||
      point.z >= this.surface.height
    ) {
      return null;
    }
    return point;
  }

  billboardBasis(): { right: Vec3; up: Vec3 } {
    return { right: this.camera.right, up: this.camera.up };
  }
}
