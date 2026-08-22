import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DragEvent,
  RotateCameraEvent,
  ZoomEvent,
} from "../../src/client/InputHandler";
import {
  THREE_D_CLEARANCE_MIN_TILT,
  THREE_D_MAX_TILT,
  THREE_D_MIN_TILT,
  threeDCameraDistance,
  threeDGroundHalfExtents,
  threeDHeightForTerrainByte,
} from "../../src/client/render/gl/three-d/ThreeDWorldMath";
import { TransformHandler } from "../../src/client/TransformHandler";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";
import { Cell } from "../../src/core/game/Game";

function createHandler(): TransformHandler {
  const width = 2048;
  const height = 1024;
  const game = {
    config: () => ({ experienceMode: () => "3d" }),
    width: () => width,
    height: () => height,
    isValidCoord: (x: number, y: number) =>
      x >= 0 && y >= 0 && x < width && y < height,
    ref: (x: number, y: number) => y * width + x,
    terrainByte: (ref: number) => {
      const x = ref % width;
      const y = Math.floor(ref / width);
      return x > 900 && x < 1150 && y > 390 && y < 640 ? 0x9a : 0x86;
    },
  } as unknown as GameView;
  const canvas = document.createElement("div");
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({
      width: 1280,
      height: 720,
      left: 0,
      top: 0,
      right: 1280,
      bottom: 720,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return new TransformHandler(game, new EventBus(), canvas);
}

describe("TransformHandler 3D camera", () => {
  it("keeps the camera target on a stable plane while terrain moves below it", () => {
    const transformSource = readFileSync(
      resolve(process.cwd(), "src/client/TransformHandler.ts"),
      "utf8",
    );
    const rendererSource = readFileSync(
      resolve(process.cwd(), "src/client/render/gl/Renderer.ts"),
      "utf8",
    );

    expect(transformSource).not.toContain(
      "centerHeight: this.threeDHeightAtFloat",
    );
    expect(rendererSource).not.toContain(
      "centerHeight: this.threeDCenterHeight",
    );
  });

  it("preserves a manually selected 3D spawn camera", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/client/ClientGameRunner.ts"),
      "utf8",
    );
    expect(source).toContain(
      'this.gameView.config().experienceMode() !== "3d"',
    );
  });
  it("clamps vertical orbit without flipping yaw across the top pole", () => {
    const handler = createHandler();
    handler.threeDYaw = 0.4;

    handler.onRotateCamera(new RotateCameraEvent(0, -100_000));

    expect(handler.threeDPitch).toBe(THREE_D_MAX_TILT);
    expect(handler.threeDYaw).toBeCloseTo(0.4);
  });

  it("reaches the forward horizon limit without passing under the map", () => {
    const handler = createHandler();

    handler.onRotateCamera(new RotateCameraEvent(0, 100_000));

    expect(handler.threeDPitch).toBe(THREE_D_MIN_TILT);
  });

  it("uses readable relief without turning the map into spikes", () => {
    const lowland = threeDHeightForTerrainByte(0x81);
    const mountain = threeDHeightForTerrainByte(0x98);
    const peak = threeDHeightForTerrainByte(0x9f);

    expect(mountain).toBeGreaterThan(lowland + 10);
    expect(peak).toBeGreaterThan(mountain + 10);
    expect(peak).toBe(57);
  });

  it("allows a close tactical camera while retaining surface clearance", () => {
    // Clearance still holds the camera 77 units above the target plane down to
    // the angle the rule reasons about...
    const distance = threeDCameraDistance(400, 48, THREE_D_CLEARANCE_MIN_TILT);
    expect(distance * Math.sin(THREE_D_CLEARANCE_MIN_TILT)).toBeCloseTo(77, 6);
  });

  // Clearance is a floor on distance and scales as 1/sin(pitch), so once the
  // orbit reached near-ground angles it grew past anything zoom asked for --
  // 430 units at the flattest tilt against 122 at the old limit. The view was
  // pinned out there and the zoom control did nothing, which is what makes a
  // camera feel broken. The angle the rule uses is clamped, so the floor stops
  // at about 161 units and zoom answers at every angle.
  it("keeps zoom working at the flattest tilt", () => {
    const at = (zoom: number) =>
      threeDCameraDistance(900, zoom, THREE_D_MIN_TILT);

    // Zooming in genuinely brings the camera closer rather than hitting a wall.
    expect(at(8)).toBeLessThan(at(4));
    expect(at(4)).toBeLessThan(at(2));
    expect(at(8)).toBeLessThan(200);

    // The floor is still there, just bounded.
    const floor = 77 / Math.sin(THREE_D_CLEARANCE_MIN_TILT);
    expect(at(1000)).toBeCloseTo(floor, 6);
    expect(floor).toBeLessThan(200);
  });

  it("uses the actual 3D camera target as the focus center", () => {
    const handler = createHandler();
    handler.offsetX = 123;
    handler.offsetY = -77;

    const center = handler.screenCenter();
    const expectedX =
      handler.offsetX + 2048 / 2 + (1280 - 2048) / (2 * handler.scale);
    const expectedY =
      handler.offsetY + 1024 / 2 + (720 - 1024) / (2 * handler.scale);

    expect(center.screenX).toBeCloseTo(expectedX, 6);
    expect(center.screenY).toBeCloseTo(expectedY, 6);
  });

  it("round-trips clicks against the same smoothed raised terrain as rendering", () => {
    const handler = createHandler();
    handler.offsetX = 0;
    handler.offsetY = 0;
    handler.scale = 2.4;
    const world = new Cell(1024, 512);

    const canvas = handler.worldToCanvasCoordinates(world);
    const roundTrip = handler.screenToWorldCoordinatesFloat(canvas.x, canvas.y);

    expect(roundTrip.x).toBeCloseTo(world.x, 1);
    expect(roundTrip.y).toBeCloseTo(world.y, 1);
  });

  it("does not redirect a missed 3D ray to the camera center", () => {
    const handler = createHandler();
    const missed = handler.screenToWorldCoordinatesFloat(640, -100_000);

    expect(Number.isNaN(missed.x)).toBe(true);
    expect(Number.isNaN(missed.y)).toBe(true);
  });

  it("keeps the 3D ground target fixed through the complete zoom range", () => {
    const handler = createHandler();
    const cameraCenter = () => ({
      x: handler.offsetX + 2048 / 2 + (1280 - 2048) / (2 * handler.scale),
      y: handler.offsetY + 1024 / 2 + (720 - 1024) / (2 * handler.scale),
    });
    handler.offsetX = 700 - 2048 / 2 - (1280 - 2048) / (2 * handler.scale);
    handler.offsetY = 400 - 1024 / 2 - (720 - 1024) / (2 * handler.scale);

    for (let i = 0; i < 80; i++) {
      handler.onZoom(new ZoomEvent(20 + i * 13, 40 + i * 7, -100));
    }

    expect(handler.scale).toBe(48);
    expect(cameraCenter().x).toBeCloseTo(700);
    expect(cameraCenter().y).toBeCloseTo(400);

    for (let i = 0; i < 120; i++) {
      handler.onZoom(new ZoomEvent(1200 - i * 9, 680 - i * 5, 100));
    }

    expect(handler.scale).toBe(0.2);
    expect(cameraCenter().x).toBeCloseTo(700);
    expect(cameraCenter().y).toBeCloseTo(400);
  });

  it("expands terrain coverage for every camera yaw", () => {
    const landscape = threeDGroundHalfExtents(
      1920,
      1080,
      1,
      THREE_D_MIN_TILT,
      0,
    );
    const quarterTurn = threeDGroundHalfExtents(
      1920,
      1080,
      1,
      THREE_D_MIN_TILT,
      Math.PI / 2,
    );

    expect(landscape.x).toBeCloseTo(quarterTurn.y);
    expect(landscape.y).toBeCloseTo(quarterTurn.x);
    expect(quarterTurn.y).toBeGreaterThan(quarterTurn.x);
  });

  it("uses the regular 2D drag translation at the default 3D yaw", () => {
    const handler = createHandler();
    handler.scale = 2;

    handler.onMove(new DragEvent(60, 35, 360, 255));

    expect(handler.offsetX).toBeCloseTo(-380, 6);
    expect(handler.offsetY).toBeCloseTo(-217.5, 6);
  });
});
