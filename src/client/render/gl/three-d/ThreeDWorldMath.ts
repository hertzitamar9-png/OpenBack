/** Shared camera and elevation contract for every 3D world pass. */
// Start above the tabletop so the battlefield is visibly below the camera.
// Players can orbit toward a lower angle with right-drag when they want to
// inspect the relief from the side.
export const THREE_D_TILT = 0.78;
export const THREE_D_FOV_DEGREES = 42;

export function threeDHeightForTerrainByte(value: number): number {
  const land = (value & 0x80) !== 0;
  const magnitude = value & 0x1f;
  if (land && magnitude === 31) return 17;
  if (land) return 0.9 + Math.pow(magnitude / 30, 1.16) * 14;
  return -0.5 - Math.min(magnitude, 10) * 0.045;
}
