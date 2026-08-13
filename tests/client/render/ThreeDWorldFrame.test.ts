import { describe, expect, it } from "vitest";
import { ThreeDWorldFrame } from "../../../src/client/render/gl/three-d/ThreeDWorldFrame";

function frame() {
  return ThreeDWorldFrame.create({
    viewportWidth: 1280,
    viewportHeight: 720,
    mapWidth: 512,
    mapHeight: 256,
    centerX: 256,
    centerZ: 128,
    zoom: 3,
    yaw: 0.4,
    pitch: 0.75,
    terrainByteAt: (x, z) =>
      x > 220 && x < 292 && z > 92 && z < 164 ? 0x9a : 0x86,
  });
}

describe("ThreeDWorldFrame", () => {
  it("round-trips the rendered smoothed mountain surface", () => {
    const world = frame();
    const projected = world.projectWorld(256, 128);
    expect(projected).not.toBeNull();
    const hit = world.intersectTerrain(projected!.x, projected!.y);
    expect(hit?.x).toBeCloseTo(256, 1);
    expect(hit?.z).toBeCloseTo(128, 1);
  });

  it("rejects rays outside the playable board", () => {
    expect(frame().intersectTerrain(640, -100_000)).toBeNull();
  });

  it("exposes a stable screen-facing basis", () => {
    const first = frame().billboardBasis();
    const second = frame().billboardBasis();
    expect(first).toEqual(second);
    expect(Math.hypot(first.right.x, first.right.y, first.right.z)).toBeCloseTo(
      1,
    );
  });
});
