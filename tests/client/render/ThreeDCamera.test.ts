import { describe, expect, it } from "vitest";
import {
  ThreeDCameraState,
  threeDFitZoom,
  threeDGroundHomography,
  type ThreeDCameraInput,
} from "../../../src/client/render/gl/three-d/ThreeDCamera";
import {
  THREE_D_MAX_TERRAIN_HEIGHT,
  THREE_D_MIN_TILT,
} from "../../../src/client/render/gl/three-d/ThreeDWorldMath";

function fixture(override: Partial<ThreeDCameraInput> = {}): ThreeDCameraInput {
  return {
    viewportWidth: 1280,
    viewportHeight: 720,
    mapWidth: 2048,
    mapHeight: 1024,
    centerX: 700,
    centerZ: 400,
    zoom: 2,
    yaw: 0.45,
    pitch: 1.05,
    ...override,
  };
}

describe("ThreeDCameraState", () => {
  it.each([
    {
      mapWidth: 4096,
      mapHeight: 2049,
      viewportWidth: 1920,
      viewportHeight: 1080,
    },
    { mapWidth: 731, mapHeight: 413, viewportWidth: 390, viewportHeight: 844 },
  ])("fits every complete map corner inside the battlefield", (shape) => {
    const zoom = threeDFitZoom({
      ...shape,
      yaw: 0.45,
      pitch: THREE_D_MIN_TILT,
      margin: 12,
    });
    const camera = ThreeDCameraState.create({
      ...shape,
      centerX: shape.mapWidth / 2,
      centerZ: shape.mapHeight / 2,
      yaw: 0.45,
      pitch: THREE_D_MIN_TILT,
      zoom,
    });

    for (const x of [0, shape.mapWidth]) {
      for (const z of [0, shape.mapHeight]) {
        for (const y of [-0.08, THREE_D_MAX_TERRAIN_HEIGHT]) {
          const screen = camera.project({ x, y, z });
          expect(screen).not.toBeNull();
          expect(screen!.x).toBeGreaterThanOrEqual(11.5);
          expect(screen!.x).toBeLessThanOrEqual(shape.viewportWidth - 11.5);
          expect(screen!.y).toBeGreaterThanOrEqual(11.5);
          expect(screen!.y).toBeLessThanOrEqual(shape.viewportHeight - 11.5);
        }
      }
    }
  });
  it("keeps shallow forward and backward views above the focused surface", () => {
    for (const yaw of [0, Math.PI]) {
      const camera = ThreeDCameraState.create(
        fixture({
          yaw,
          pitch: THREE_D_MIN_TILT,
          zoom: 48,
          centerHeight: 72,
        }),
      );
      expect(camera.position.y).toBeGreaterThan(72);
      expect(camera.up.y).toBeGreaterThan(0);
    }
  });

  it("round-trips a raised terrain point through screen projection", () => {
    const camera = ThreeDCameraState.create(fixture());
    const screen = camera.project({ x: 700, y: 18, z: 400 });
    expect(screen).not.toBeNull();
    const world = camera.intersectHeightField(screen!.x, screen!.y, () => 18);
    expect(world).not.toBeNull();
    expect(world!.x).toBeCloseTo(700, 4);
    expect(world!.y).toBeCloseTo(18, 4);
    expect(world!.z).toBeCloseTo(400, 4);
  });

  it("round-trips off-center terrain points while yawed", () => {
    const camera = ThreeDCameraState.create(fixture({ yaw: -0.6 }));
    const expected = { x: 830, y: 6, z: 470 };
    const screen = camera.project(expected)!;
    const world = camera.intersectHeightField(screen.x, screen.y, () => 6)!;
    expect(world.x).toBeCloseTo(expected.x, 4);
    expect(world.z).toBeCloseTo(expected.z, 4);
  });

  it("uses finite clipping planes that contain every padded map corner", () => {
    const camera = ThreeDCameraState.create(fixture());
    expect(camera.near).toBeGreaterThan(0);
    expect(camera.far).toBeGreaterThan(camera.near);
    expect(camera.viewProjection.every(Number.isFinite)).toBe(true);
    for (const x of [0, 2048]) {
      for (const z of [0, 1024]) {
        const dx = x - camera.position.x;
        const dy = THREE_D_MAX_TERRAIN_HEIGHT - camera.position.y;
        const dz = z - camera.position.z;
        expect(Math.hypot(dx, dy, dz)).toBeLessThan(camera.far);
      }
    }
  });

  it("returns no projection for points behind the camera", () => {
    const camera = ThreeDCameraState.create(fixture());
    const behind = {
      x: camera.position.x - camera.forward.x * 10,
      y: camera.position.y - camera.forward.y * 10,
      z: camera.position.z - camera.forward.z * 10,
    };
    expect(camera.project(behind)).toBeNull();
  });

  it("creates normalized screen rays at all viewport corners", () => {
    const camera = ThreeDCameraState.create(fixture());
    for (const [x, y] of [
      [0, 0],
      [1280, 0],
      [0, 720],
      [1280, 720],
    ]) {
      const ray = camera.screenRay(x, y);
      expect(
        Math.hypot(ray.direction.x, ray.direction.y, ray.direction.z),
      ).toBeCloseTo(1, 8);
      expect(Object.values(ray.direction).every(Number.isFinite)).toBe(true);
    }
  });

  it("projects tactical ground anchors through the canonical camera", () => {
    const camera = ThreeDCameraState.create(fixture());
    const matrix = threeDGroundHomography(camera, 6);
    const world = { x: 830, y: 6, z: 470 };
    const projected = camera.project(world)!;
    const clipX = matrix[0] * world.x + matrix[3] * world.z + matrix[6];
    const clipY = matrix[1] * world.x + matrix[4] * world.z + matrix[7];
    const clipW = matrix[2] * world.x + matrix[5] * world.z + matrix[8];
    expect(((clipX / clipW + 1) * camera.viewportWidth) / 2).toBeCloseTo(
      projected.x,
      4,
    );
    expect(((1 - clipY / clipW) * camera.viewportHeight) / 2).toBeCloseTo(
      projected.y,
      4,
    );
  });
});
