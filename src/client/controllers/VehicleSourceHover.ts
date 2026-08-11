import { UnitType } from "../../core/game/Game";

const ICON_SIZE = 60;
const DOTS_ZOOM_THRESHOLD = 1.2;
const DOT_SCALE = 0.3;
const ICON_SCALE_FACTOR_ZOOMED_OUT = 3;
const ICON_GROW_ZOOM = 7;

const ICON_FILL: Readonly<Partial<Record<UnitType, number>>> = {
  [UnitType.Runway]: 0.85,
  [UnitType.MilitaryBase]: 0.9,
};

/** Mirrors the visible (non-transparent) StructurePass icon footprint. */
export function vehicleSourceHoverHalfExtent(
  zoom: number,
  type: UnitType.Runway | UnitType.MilitaryBase,
): number {
  const safeZoom = Math.max(0.001, zoom);
  let iconScale: number;
  if (safeZoom <= DOTS_ZOOM_THRESHOLD) iconScale = DOT_SCALE;
  else if (safeZoom >= ICON_GROW_ZOOM) iconScale = safeZoom / ICON_GROW_ZOOM;
  else iconScale = Math.min(1, safeZoom / ICON_SCALE_FACTOR_ZOOMED_OUT);
  return (ICON_SIZE * iconScale * 0.5 * (ICON_FILL[type] ?? 0.85)) / safeZoom;
}

export function isPointerOverVehicleSource(
  hover: { x: number; y: number },
  source: { x: number; y: number },
  zoom: number,
  type: UnitType.Runway | UnitType.MilitaryBase,
): boolean {
  const halfExtent = vehicleSourceHoverHalfExtent(zoom, type);
  return (
    Math.abs(hover.x - (source.x + 0.5)) <= halfExtent &&
    Math.abs(hover.y - (source.y + 0.5)) <= halfExtent
  );
}
