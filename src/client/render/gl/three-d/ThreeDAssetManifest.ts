import manifestJson from "resources/3d/manifest.json";

import { UnitType } from "../../../../core/game/Game";

export type ThreeDAssetLicense = "CC0-1.0" | "CC-BY-3.0" | "CC-BY-4.0";

export interface ThreeDAssetDefinition {
  url: string;
  sha256: string;
  license: ThreeDAssetLicense;
  sourceUrl: string;
  creator: string;
  scale: number;
  rotation: readonly [number, number, number];
}

export const THREE_D_ASSET_MANIFEST = manifestJson as unknown as Record<
  UnitType,
  ThreeDAssetDefinition
>;

export function threeDAsset(type: UnitType): ThreeDAssetDefinition {
  const definition = THREE_D_ASSET_MANIFEST[type];
  if (!definition) throw new Error(`Missing 3D asset definition for ${type}`);
  return definition;
}
