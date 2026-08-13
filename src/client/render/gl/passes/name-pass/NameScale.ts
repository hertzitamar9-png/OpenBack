const FLAG_ASPECT = 128 / 85;
const TERRITORY_WIDTH_FILL = 0.92;

interface NameScaleMetrics {
  fontSize: number;
  fontBase: number;
  nameScaleFactor: number;
  nameScaleCap: number;
}

interface NamePlateMetrics extends NameScaleMetrics {
  baseSize: number;
  nameHalfWidth: number;
  hasFlag: boolean;
  verified: boolean;
}

interface FitNameScaleInput extends NameScaleMetrics {
  requestedSize: number;
  availableWidth: number;
  nameHalfWidth: number;
  hasFlag: boolean;
  verified: boolean;
}

/** Mirrors the shared sizing pipeline in the name, flag, and status shaders. */
export function nameWorldScale({
  baseSize,
  fontSize,
  nameScaleFactor,
  nameScaleCap,
}: NamePlateMetrics): number {
  const flooredSize = Math.max(1, Math.floor(baseSize));
  const nameSize = Math.max(4, Math.floor(flooredSize * nameScaleFactor));
  const nameScale = Math.min(flooredSize * 0.25, nameScaleCap);
  return (nameSize * nameScale) / fontSize;
}

/** Width of the complete visible name row, not only its text glyphs. */
export function renderedNamePlateWidth(input: NamePlateMetrics): number {
  const scale = nameWorldScale(input);
  const textWidth = input.nameHalfWidth * 2 * scale;
  const flagWidth = input.hasFlag
    ? input.fontBase * scale * 1.2 * FLAG_ASPECT
    : 0;
  const verifiedSize = input.verified ? input.fontBase * scale * 0.9 : 0;
  const verifiedWidth = verifiedSize * 1.12;
  return textWidth + flagWidth + verifiedWidth;
}

/**
 * Keep a name row inside the rectangle selected by NameBoxCalculator. The
 * downward integer search is intentional: shader sizing floors the territory
 * size, so an analytic scale would still jump at the same thresholds.
 */
export function fitNameScaleToTerritory(input: FitNameScaleInput): number {
  if (!Number.isFinite(input.availableWidth) || input.availableWidth <= 0) {
    return input.requestedSize;
  }
  const maxWidth = input.availableWidth * TERRITORY_WIDTH_FILL;
  const requested = Math.max(1, Math.floor(input.requestedSize));
  for (let size = requested; size >= 1; size--) {
    if (renderedNamePlateWidth({ ...input, baseSize: size }) <= maxWidth) {
      return size;
    }
  }
  return 1;
}
