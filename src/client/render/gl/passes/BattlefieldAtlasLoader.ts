import { assetUrl } from "../../../../core/AssetUrls";

const atlasImages = new Map<string, Promise<HTMLImageElement>>();

/**
 * Decode a battlefield atlas once and share it between the preload gate and
 * the WebGL passes. This prevents the first frames of a match from sampling a
 * one-pixel placeholder while the browser is still decoding the real art.
 */
export function loadBattlefieldAtlas(url: string): Promise<HTMLImageElement> {
  let pending = atlasImages.get(url);
  if (!pending) {
    pending = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load atlas: ${url}`));
      image.src = url;
    });
    atlasImages.set(url, pending);
  }
  return pending;
}

export function preloadBattlefieldAtlases(): Promise<void> {
  return Promise.all([
    loadBattlefieldAtlas(assetUrl("atlases/unit-atlas.png")),
    loadBattlefieldAtlas(assetUrl("atlases/icon-atlas.png")),
  ]).then(() => undefined);
}
