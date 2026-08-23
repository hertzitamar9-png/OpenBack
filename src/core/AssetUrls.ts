export type AssetManifest = Record<string, string>;

function safeDecodeAssetSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function assertSafeAssetSegment(segment: string): string {
  const decodedSegment = safeDecodeAssetSegment(segment);
  if (
    segment === "." ||
    segment === ".." ||
    decodedSegment === "." ||
    decodedSegment === ".."
  ) {
    throw new Error(`Invalid asset path segment: ${segment}`);
  }
  return decodedSegment;
}

export function encodeAssetPath(path: string): string {
  // `@` is a valid path-segment character and is used by the committed
  // thumbnail@2x.webp files. Encoding it as %40 makes Vite's SPA fallback
  // serve index.html instead of the image, so the high-resolution candidate
  // silently fails. Keep it literal while still encoding unsafe characters.
  return normalizeAssetPath(path)
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment).replace(/%40/gi, "@"))
    .join("/");
}

export function normalizeAssetPath(path: string): string {
  const normalizedPath = path
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => assertSafeAssetSegment(segment))
    .join("/");

  if (normalizedPath.length === 0) {
    throw new Error("Asset path must not be empty");
  }

  return normalizedPath;
}

function isAbsoluteUrl(path: string): boolean {
  return /^(?:https?:\/\/|data:|blob:)/i.test(path);
}

const RESILIENT_IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

export function isImageAssetPath(path: string): boolean {
  const normalizedPath = normalizeAssetPath(path);
  const extensionStart = normalizedPath.lastIndexOf(".");
  return (
    extensionStart !== -1 &&
    RESILIENT_IMAGE_EXTENSIONS.has(
      normalizedPath.slice(extensionStart).toLowerCase(),
    )
  );
}

function getManifestAssetVersion(manifestUrl: string): string | null {
  const fileName = manifestUrl.split("?", 1)[0].split("/").pop();
  if (!fileName) return null;

  const extensionStart = fileName.lastIndexOf(".");
  const versionStart = fileName.lastIndexOf(".", extensionStart - 1);
  if (versionStart === -1 || extensionStart === -1) return null;

  return fileName.slice(versionStart + 1, extensionStart) || null;
}

export function buildAssetUrl(
  path: string,
  assetManifest: AssetManifest = {},
  baseUrl: string = "",
): string {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = normalizeAssetPath(path);

  const directUrl = assetManifest[normalizedPath];
  if (directUrl) {
    // Image files are also emitted at a stable same-origin path. The manifest
    // hash is retained as a cache key, but an older app bundle can still load
    // the current file after a rolling deploy removes its old hashed copy.
    // This prevents broken flags, Help illustrations, icons, and thumbnails
    // without moving large maps/audio off the immutable asset pipeline.
    if (isImageAssetPath(normalizedPath)) {
      const stableUrl = `/${encodeAssetPath(normalizedPath)}`;
      const version = getManifestAssetVersion(directUrl);
      return version
        ? `${stableUrl}?v=${encodeURIComponent(version)}`
        : stableUrl;
    }
    return baseUrl ? `${baseUrl.replace(/\/+$/, "")}${directUrl}` : directUrl;
  }

  return `/${encodeAssetPath(normalizedPath)}`;
}

declare global {
  var __ASSET_MANIFEST__: AssetManifest | undefined;
  var __CDN_BASE__: string | undefined;
}

export function getAssetManifest(): AssetManifest {
  if (
    typeof window !== "undefined" &&
    window.BOOTSTRAP_CONFIG?.assetManifest !== undefined
  ) {
    return window.BOOTSTRAP_CONFIG.assetManifest;
  }
  return globalThis.__ASSET_MANIFEST__ ?? {};
}

// Web workers have no `window`, so they read `__CDN_BASE__` off globalThis,
// which Worker.worker.ts sets from the init message before any asset fetches.
// Without this fallback, asset fetches inside workers (e.g. map binaries)
// would silently bypass the CDN.
export function getCdnBase(): string {
  if (
    typeof window !== "undefined" &&
    window.BOOTSTRAP_CONFIG?.cdnBase !== undefined
  ) {
    return window.BOOTSTRAP_CONFIG.cdnBase;
  }
  return globalThis.__CDN_BASE__ ?? "";
}

export function assetUrl(path: string): string {
  return buildAssetUrl(path, getAssetManifest(), getCdnBase());
}

// Rewrites Vite's emitted /assets/... references in the built index.html to
// use the cdnBaseRaw EJS placeholder, so RenderHtml.ts can prefix them with
// CDN_BASE at request time. Scoped to src=/href= attribute values so inline
// scripts containing the literal "/assets/..." can't be mangled. Does NOT
// match /_assets/ (underscore) — source-asset manifest URLs are prefixed via
// buildAssetUrl, not this rewrite. Falls back to "" when cdnBaseRaw is missing
// so a future renderer that forgets to provide it still produces working
// same-origin URLs.
export function rewriteAssetsForCdn(html: string): string {
  return html.replace(
    /(\s(?:src|href)=)(["'])\/assets\//g,
    `$1$2<%- locals.cdnBaseRaw || "" %>/assets/`,
  );
}
