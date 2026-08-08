/** Shared camera and elevation contract for every 3D world pass. */
// Start from a deliberate tabletop camera: the camera is above and behind the
// focus point, looking down at a horizontal battlefield. This is steep enough
// to play comfortably while still exposing coast cliffs and mountain relief.
export const THREE_D_TILT = 1.14;
export const THREE_D_MIN_TILT = 0.68;
export const THREE_D_MAX_TILT = Math.PI / 2 - 0.045;
export const THREE_D_FOV_DEGREES = 42;
export const THREE_D_MAX_TERRAIN_HEIGHT = 52;

export function threeDCameraDistance(
  viewportHeight: number,
  zoom: number,
  pitch: number,
): number {
  const tanHalfFov = Math.tan((THREE_D_FOV_DEGREES * Math.PI) / 360);
  const requested = viewportHeight / Math.max(0.01, zoom * 2) / tanHalfFov;
  // A raised peak must never pass through the camera's near plane at close
  // zoom. Keep enough clearance for terrain plus the tallest unit effects.
  const terrainClearance =
    THREE_D_MAX_TERRAIN_HEIGHT * Math.max(0, Math.cos(pitch)) + 10;
  return Math.max(requested, terrainClearance);
}

export function threeDHeightForTerrainByte(value: number): number {
  const land = (value & 0x80) !== 0;
  const magnitude = value & 0x1f;
  if (land && magnitude === 31) return THREE_D_MAX_TERRAIN_HEIGHT;
  if (land) return 0.15 + Math.pow(magnitude / 30, 2) * 43;
  return -Math.min(magnitude, 10) * 0.02;
}
