export type WarTableDetail = "silhouette" | "material" | "mechanical";

export interface WarTableLod {
  detail: WarTableDetail;
  detailScale: number;
}

export interface WarTableMotion {
  decorativeScale: number;
  warningScale: 1;
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
