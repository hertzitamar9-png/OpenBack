import { assetUrl } from "../../../../core/AssetUrls";
import { parseGlbMesh, type ParsedGlbMesh } from "./GltfBinary";
import type { ThreeDAssetDefinition } from "./ThreeDAssetManifest";

const cache = new Map<string, Promise<ParsedGlbMesh>>();

export function loadThreeDAsset(
  definition: ThreeDAssetDefinition,
): Promise<ParsedGlbMesh> {
  let pending = cache.get(definition.url);
  if (!pending) {
    pending = fetch(assetUrl(definition.url)).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `${definition.url}: HTTP ${response.status} ${response.statusText}`,
        );
      }
      return parseGlbMesh(await response.arrayBuffer(), definition.url);
    });
    cache.set(definition.url, pending);
  }
  return pending;
}

export function clearThreeDAssetCache(): void {
  cache.clear();
}
