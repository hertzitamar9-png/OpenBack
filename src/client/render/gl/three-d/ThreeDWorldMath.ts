/** Shared camera and elevation contract for every 3D world pass. */
// Start from a deliberate tabletop camera: the camera is above and behind the
// focus point, looking down at a horizontal battlefield. This is steep enough
// to play comfortably while still exposing coast cliffs and mountain relief.
export const THREE_D_TILT = 1.14;
// How far the orbit may travel either side of the default tabletop angle.
//
// The low end is a near-ground vista rather than a mild lean: at about 10
// degrees the horizon sits high in frame and terrain reads as landscape you
// are standing in front of, which is what sells the world as 3D. The camera
// pulls back as it drops, because threeDCameraDistance keeps the eye clear of
// the tallest peak whatever the angle -- tilting down and swinging out are the
// same gesture.
//
// The high end stops just short of straight down. At exactly 90 degrees the
// view direction is parallel to world up, cross(forward, up) collapses to a
// zero vector, and the camera basis (and everything derived from it) becomes
// NaN, so a margin has to remain.
export const THREE_D_MIN_TILT = 0.18;
export const THREE_D_MAX_TILT = Math.PI / 2 - 0.02;
export const THREE_D_FOV_DEGREES = 42;
export const THREE_D_RELIEF_SCALE = 1.5;
export const THREE_D_MAX_TERRAIN_HEIGHT = 38 * THREE_D_RELIEF_SCALE;

export function threeDCameraDistance(
  viewportHeight: number,
  zoom: number,
  pitch: number,
): number {
  const tanHalfFov = Math.tan((THREE_D_FOV_DEGREES * Math.PI) / 360);
  const requested = viewportHeight / Math.max(0.01, zoom * 2) / tanHalfFov;
  // Keep the camera on a stable sea-level target plane. Following the sampled
  // terrain height makes every tile transition move the entire camera and is
  // perceived as violent shaking while panning.
  const terrainClearance =
    (THREE_D_MAX_TERRAIN_HEIGHT + 20) /
    Math.max(0.1, Math.sin(Math.max(THREE_D_MIN_TILT, pitch)));
  return Math.max(requested, terrainClearance);
}

export function threeDGroundHalfExtents(
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
  pitch: number,
  yaw: number,
): { x: number; y: number } {
  const tanHalfFov = Math.tan((THREE_D_FOV_DEGREES * Math.PI) / 360);
  const distance = threeDCameraDistance(viewportHeight, zoom, pitch);
  const aspect = viewportWidth / Math.max(1, viewportHeight);
  // The ground mesh is axis-aligned in map space while the camera can orbit
  // freely. Rotate the view-aligned coverage rectangle into a map-space AABB
  // so no yaw or zoom can expose an edge of the generated terrain.
  const viewHalfX = distance * tanHalfFov * aspect * 3.5;
  const viewHalfY = distance * tanHalfFov * 3.5;
  const cosYaw = Math.abs(Math.cos(yaw));
  const sinYaw = Math.abs(Math.sin(yaw));
  return {
    x: cosYaw * viewHalfX + sinYaw * viewHalfY,
    y: sinYaw * viewHalfX + cosYaw * viewHalfY,
  };
}

export function threeDHeightForTerrainByte(value: number): number {
  const land = (value & 0x80) !== 0;
  const magnitude = value & 0x1f;
  if (land && magnitude === 31) return THREE_D_MAX_TERRAIN_HEIGHT;
  if (land)
    return (0.15 + Math.pow(magnitude / 30, 2) * 31) * THREE_D_RELIEF_SCALE;
  return -Math.min(magnitude, 10) * 0.02;
}
