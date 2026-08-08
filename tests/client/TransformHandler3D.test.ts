import { describe, expect, it } from "vitest";
import { RotateCameraEvent } from "../../src/client/InputHandler";
import { TransformHandler } from "../../src/client/TransformHandler";
import {
  THREE_D_MAX_TILT,
  THREE_D_MIN_TILT,
  threeDHeightForTerrainByte,
} from "../../src/client/render/gl/three-d/ThreeDWorldMath";
import type { GameView } from "../../src/client/view";
import { EventBus } from "../../src/core/EventBus";

function createHandler(): TransformHandler {
  const game = {
    config: () => ({ worldMechanics: () => ({ threeDMode: true }) }),
  } as unknown as GameView;
  const canvas = document.createElement("div");
  return new TransformHandler(game, new EventBus(), canvas);
}

describe("TransformHandler 3D camera", () => {
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

    expect(mountain).toBeGreaterThan(lowland + 20);
    expect(peak).toBeGreaterThan(mountain + 20);
  });
});
