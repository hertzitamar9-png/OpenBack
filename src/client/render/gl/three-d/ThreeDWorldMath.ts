/** Shared camera and elevation contract for every 3D world pass. */
// Start from a deliberate tabletop camera: the camera is above and behind the
// focus point, looking down at a horizontal battlefield. This is steep enough
// to play comfortably while still exposing coast cliffs and mountain relief.
export const THREE_D_TILT = 1.14;
export const THREE_D_MIN_TILT = 0.85;
export const THREE_D_MAX_TILT = 1.36;
export const THREE_D_FOV_DEGREES = 42;

export function threeDHeightForTerrainByte(value: number): number {
  const land = (value & 0x80) !== 0;
  const magnitude = value & 0x1f;
  if (land && magnitude === 31) return 24;
  if (land) return 1.8 + Math.pow(magnitude / 30, 1.5) * 10.5;
  return -1.1 - Math.min(magnitude, 10) * 0.07;
}
