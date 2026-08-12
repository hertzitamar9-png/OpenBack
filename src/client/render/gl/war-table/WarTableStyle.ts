export type WarTableDetail = "silhouette" | "material" | "mechanical";

export interface WarTableLod {
  detail: WarTableDetail;
  detailScale: number;
}

export interface WarTableMotion {
  decorativeScale: number;
  warningScale: 1;
}

export const WAR_TABLE_OVERLAY = Object.freeze({
  pathWidth: 1.35,
  dashInterval: 8,
  labelOutline: 1.5,
  barHeight: 3,
  targetAlpha: 0.34,
  selectionPulse: 0.16,
});

export function clampWarTableLabelSize(size: number, zoom: number): number {
  const safeSize = Number.isFinite(size) ? size : 12;
  const safeZoom = Number.isFinite(zoom) ? zoom : 1;
  return Math.max(
    8,
    Math.min(30, safeSize * Math.sqrt(Math.max(0.05, safeZoom))),
  );
}

export function warTableLod(zoom: number): WarTableLod {
  if (zoom < 0.5) return { detail: "silhouette", detailScale: 0 };
  if (zoom < 1.1) return { detail: "material", detailScale: 0.55 };
  return { detail: "mechanical", detailScale: 1 };
}

export function warTableMotion(reducedMotion: boolean): WarTableMotion {
  return {
    decorativeScale: reducedMotion ? 0 : 1,
    warningScale: 1,
  };
}
