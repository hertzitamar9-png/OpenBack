import { describe, expect, it } from "vitest";
import { ThreeDCameraState } from "../../../src/client/render/gl/three-d/ThreeDCamera";
import {
  audioListener,
  MAX_SPATIAL_DISTANCE,
  planSpatialSound,
  setAudioListener,
  type AudioListenerState,
} from "../../../src/client/sound/SpatialAudio";

const MAP = 1000;

// Drive the tests from the real camera rather than hand-built vectors, so the
// listener basis is exactly the one the renderer draws with.
function listenerAt(opts: {
  centerX: number;
  centerZ: number;
  yaw: number;
  zoom?: number;
}): AudioListenerState {
  const camera = ThreeDCameraState.create({
    viewportWidth: 1600,
    viewportHeight: 900,
    mapWidth: MAP,
    mapHeight: MAP,
    centerX: opts.centerX,
    centerZ: opts.centerZ,
    zoom: opts.zoom ?? 1,
    yaw: opts.yaw,
    pitch: 0.9,
  });
  return {
    position: camera.position,
    forward: camera.forward,
    right: camera.right,
    up: camera.up,
    distance: camera.distance,
  };
}

describe("planSpatialSound", () => {
  const centre = { centerX: 500, centerZ: 500, yaw: 0 };

  it("puts what the camera is looking at in front of the listener", () => {
    const p = planSpatialSound(listenerAt(centre), { x: 500, y: 500 });
    expect(p).not.toBeNull();
    // Web Audio looks down -Z, so ahead is negative.
    expect(p!.z).toBeLessThan(0);
    expect(Math.abs(p!.x)).toBeLessThan(0.01);
  });

  it("puts a sound to the east on the right and one to the west on the left", () => {
    const listener = listenerAt(centre);
    const east = planSpatialSound(listener, { x: 800, y: 500 })!;
    const west = planSpatialSound(listener, { x: 200, y: 500 })!;

    expect(east.x).toBeGreaterThan(0);
    expect(west.x).toBeLessThan(0);
    // Mirrored either side of the view centre.
    expect(east.x).toBeCloseTo(-west.x, 5);
  });

  it("puts a sound behind the camera behind the listener", () => {
    // Camera sits south of centre looking north, so far south is behind it.
    const behind = planSpatialSound(listenerAt(centre), { x: 500, y: 5000 })!;
    expect(behind.z).toBeGreaterThan(0);
  });

  it("follows the camera around as it turns", () => {
    const sound = { x: 800, y: 500 };
    const facingNorth = planSpatialSound(listenerAt(centre), sound)!;
    // Turn 180 degrees: what was on the right is now on the left.
    const turned = planSpatialSound(
      listenerAt({ ...centre, yaw: Math.PI }),
      sound,
    )!;

    expect(facingNorth.x).toBeGreaterThan(0);
    expect(turned.x).toBeLessThan(0);
  });

  it("places a sound the same way at any zoom", () => {
    // Positions are expressed in camera distances, so the same geometry on a
    // close-up and a pulled-back camera reads the same to the ear.
    const near = planSpatialSound(listenerAt({ ...centre, zoom: 4 }), {
      x: 500,
      y: 500,
    })!;
    const far = planSpatialSound(listenerAt({ ...centre, zoom: 0.25 }), {
      x: 500,
      y: 500,
    })!;
    expect(near.x).toBeCloseTo(far.x, 5);
    expect(near.y).toBeCloseTo(far.y, 5);
    expect(near.z).toBeCloseTo(far.z, 5);
  });

  it("stops distant sounds receding forever", () => {
    const p = planSpatialSound(listenerAt(centre), { x: 9_000_000, y: 500 })!;
    const radius = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    expect(radius).toBeCloseTo(MAX_SPATIAL_DISTANCE, 5);
    // Direction survives the clamp.
    expect(p.x).toBeGreaterThan(0);
  });

  it("falls back to flat playback without a usable listener", () => {
    expect(planSpatialSound(null, { x: 1, y: 1 })).toBeNull();

    const broken: AudioListenerState = {
      ...listenerAt(centre),
      distance: 0,
    };
    expect(planSpatialSound(broken, { x: 1, y: 1 })).toBeNull();
    expect(
      planSpatialSound(listenerAt(centre), { x: Number.NaN, y: 1 }),
    ).toBeNull();
  });
});

describe("the published listener", () => {
  it("starts empty, takes the renderer's camera, and clears again", () => {
    setAudioListener(null);
    expect(audioListener()).toBeNull();

    const state = listenerAt({ centerX: 100, centerZ: 100, yaw: 0.5 });
    setAudioListener(state);
    expect(audioListener()).toBe(state);

    // The flat war table clears it, so its sounds play unpositioned.
    setAudioListener(null);
    expect(audioListener()).toBeNull();
  });
});
