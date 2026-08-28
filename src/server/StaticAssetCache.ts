const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

// Dynamic root files (no content hash in the URL) that we update in place on
// every deploy. They MUST revalidate, otherwise express.static's default
// `maxAge: 1y` makes browsers cache e.g. an empty-flags cosmetics.json for a
// year and never pick up new shop content.
const REVALIDATE_ROOT_FILES = new Set([
  "/cosmetics.json",
  "/favicon.png",
  "/favicon.svg",
  "/news.json",
]);
const REVALIDATE_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const NO_STORE_ROOT_FILES = new Set([
  "/privacy-policy.html",
  "/terms-of-service.html",
]);
const NO_STORE_CACHE_CONTROL = "no-store";

function stripQueryString(urlPath: string): string {
  return urlPath.split("?", 1)[0];
}

function isGeneratedAssetPath(urlPath: string): boolean {
  return urlPath.startsWith("/assets/") || urlPath.startsWith("/_assets/");
}

export function getStaticAssetCacheControl(
  urlPath: string | undefined,
): string | undefined {
  if (!urlPath) {
    return undefined;
  }

  const normalizedPath = stripQueryString(urlPath);
  if (NO_STORE_ROOT_FILES.has(normalizedPath)) {
    return NO_STORE_CACHE_CONTROL;
  }

  if (isGeneratedAssetPath(normalizedPath)) {
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
  if (urlPath && isGeneratedAssetPath(stripQueryString(urlPath))) {
    // These are implementation files, never standalone search results. Keep
    // them crawlable so engines can observe noindex and remove old listings.
    setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
}
