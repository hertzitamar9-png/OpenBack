const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

// Dynamic root files (no content hash in the URL) that we update in place on
// every deploy. They MUST revalidate, otherwise express.static's default
// `maxAge: 1y` makes browsers cache e.g. an empty-flags cosmetics.json for a
// year and never pick up new shop content.
const REVALIDATE_ROOT_FILES = new Set(["/cosmetics.json", "/news.json"]);
const REVALIDATE_CACHE_CONTROL = "public, max-age=0, must-revalidate";

function stripQueryString(urlPath: string): string {
  return urlPath.split("?", 1)[0];
}

export function getStaticAssetCacheControl(
  urlPath: string | undefined,
): string | undefined {
  if (!urlPath) {
    return undefined;
  }

  const normalizedPath = stripQueryString(urlPath);
  if (
    normalizedPath.startsWith("/assets/") ||
    normalizedPath.startsWith("/_assets/")
  ) {
    return IMMUTABLE_CACHE_CONTROL;
  }

  if (REVALIDATE_ROOT_FILES.has(normalizedPath)) {
    return REVALIDATE_CACHE_CONTROL;
  }

  return undefined;
}

export function applyStaticAssetCacheControl(
  setHeader: (name: string, value: string) => void,
  urlPath: string | undefined,
): void {
  const cacheControl = getStaticAssetCacheControl(urlPath);
  if (cacheControl) {
    setHeader("Cache-Control", cacheControl);
  }
}
