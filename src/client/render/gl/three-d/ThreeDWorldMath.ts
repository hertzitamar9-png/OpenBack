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
  if (land) return 0.15 + Math.pow(magnitude / 30, 2) * 43;
  return -Math.min(magnitude, 10) * 0.02;
}
