import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DragEvent,
  RotateCameraEvent,
  ZoomEvent,
} from "../../src/client/InputHandler";
import { TransformHandler } from "../../src/client/TransformHandler";
import {
  THREE_D_MAX_TILT,
  THREE_D_MIN_TILT,
  threeDCameraDistance,
  threeDGroundHalfExtents,
  threeDHeightForTerrainByte,
} from "../../src/client/render/gl/three-d/ThreeDWorldMath";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";
import { Cell } from "../../src/core/game/Game";

function createHandler(): TransformHandler {
  const game = {
    config: () => ({ worldMechanics: () => ({ threeDMode: true }) }),
    width: () => 2048,
    height: () => 1024,
    isValidCoord: () => false,
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
  it("preserves a manually selected 3D spawn camera", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/client/ClientGameRunner.ts"),
      "utf8",
    );
    expect(source).toContain(
      "!this.gameView.config().worldMechanics().threeDMode",
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

  it("uses visibly separated lowland, mountain, and peak elevations", () => {
    const lowland = threeDHeightForTerrainByte(0x81);
    const mountain = threeDHeightForTerrainByte(0x98);
    const peak = threeDHeightForTerrainByte(0x9f);

    expect(mountain).toBeGreaterThan(lowland + 40);
    expect(peak).toBeGreaterThan(mountain + 40);
    expect(peak).toBe(104);
  });

  it("allows a close tactical camera while retaining surface clearance", () => {
    const distance = threeDCameraDistance(400, 48, THREE_D_MIN_TILT);
    expect(distance * Math.sin(THREE_D_MIN_TILT)).toBeGreaterThanOrEqual(12);
    expect(distance).toBeLessThan(24);
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

  it("keeps the picked ground under the pointer during left drag", () => {
    const handler = createHandler();
    const picked = handler.screenToWorldCoordinatesFloat(300, 220);

    handler.onMove(new DragEvent(60, 35, 360, 255));

    const projected = handler.worldToScreenCoordinates(
      new Cell(picked.x, picked.y),
    );
    expect(projected.x).toBeCloseTo(360, 0);
    expect(projected.y).toBeCloseTo(255, 0);
  });
});
