/**
 * Positional audio for the Immersive 3D world.
 *
 * The renderer publishes the camera it drew with; sounds that happen at a
 * place on the map are then played from that place relative to it, so a nuke
 * landing to your left is heard on your left and one behind the camera is
 * heard behind you.
 *
 * Positions handed to Web Audio are expressed in *camera distances* rather
 * than raw map tiles: the listener sits at the origin looking down -Z (the Web
 * Audio default), and a source is placed at its offset from the camera divided
 * by how far the camera is from the ground. A sound at the centre of the view
 * therefore lands at the same distance whether the map is a small island or a
 * whole continent, and whether you are zoomed in or out, so one set of panner
 * settings behaves the same everywhere.
 *
 * The 2D war table publishes no listener, and sounds fall back to plain
 * non-positional playback.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface AudioListenerState {
  /** Camera eye, in world units (x across, y up, z down the map). */
  readonly position: Vec3;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  /** Distance from the eye to what it is looking at; the normalising scale. */
  readonly distance: number;
}

/** A map position a sound happens at, in tile coordinates. */
export interface SoundOrigin {
  readonly x: number;
  readonly y: number;
}

/** Where to put the source, in Web Audio's listener-relative frame. */
export interface SpatialPlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * How far out a source may sit before it stops getting quieter. Beyond a few
 * camera distances a sound is off-screen anyway, and letting the falloff run
 * to zero makes distant events vanish instead of reading as far away.
 */
export const MAX_SPATIAL_DISTANCE = 6;

export const SPATIAL_PANNER_ATTR = {
  panningModel: "HRTF",
  distanceModel: "inverse",
  refDistance: 1,
  maxDistance: MAX_SPATIAL_DISTANCE,
  rolloffFactor: 0.9,
} as const;

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

const finite = (value: number): boolean => Number.isFinite(value);

/**
 * Place a map-space sound relative to the camera, or null when the listener is
 * unusable (no 3D frame yet, a degenerate camera) and the caller should play
 * the sound flat instead.
 */
export function planSpatialSound(
  listener: AudioListenerState | null,
  origin: SoundOrigin,
): SpatialPlacement | null {
  if (listener === null) return null;
  if (!finite(origin.x) || !finite(origin.y)) return null;
  const scale = listener.distance;
  if (!finite(scale) || scale <= 0) return null;

  // Sounds happen on the ground plane; height is not worth tracking per unit.
  const delta: Vec3 = {
    x: origin.x - listener.position.x,
    y: -listener.position.y,
    z: origin.y - listener.position.z,
  };

  const right = dot(delta, listener.right) / scale;
  const up = dot(delta, listener.up) / scale;
  // Web Audio looks down -Z, so what the camera sees ahead is negative Z.
  const ahead = -dot(delta, listener.forward) / scale;

  if (!finite(right) || !finite(up) || !finite(ahead)) return null;

  // Clamp the radius rather than each axis, so direction survives while
  // distance stops growing once the source is well outside the view.
  const length = Math.sqrt(right * right + up * up + ahead * ahead);
  if (length > MAX_SPATIAL_DISTANCE) {
    const k = MAX_SPATIAL_DISTANCE / length;
    return { x: right * k, y: up * k, z: ahead * k };
  }
  return { x: right, y: up, z: ahead };
}

// The renderer writes this once per drawn 3D frame and clears it when the 2D
// war table takes over. A plain module value rather than an event: it changes
// every frame and only matters at the moment a sound starts, so the sound
// system pulls the latest instead of the renderer pushing 60 events a second.
let current: AudioListenerState | null = null;

export function setAudioListener(state: AudioListenerState | null): void {
  current = state;
}

export function audioListener(): AudioListenerState | null {
  return current;
}
