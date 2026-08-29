import ejs from "ejs";
import type { Response } from "express";
import fs from "node:fs/promises";
import { buildAssetUrl, toAbsoluteAssetUrl } from "../core/AssetUrls";
import { setNoStoreHeaders } from "./NoStoreHeaders";
import { getRuntimeAssetManifest } from "./RuntimeAssetManifest";
import { ServerEnv } from "./ServerEnv";

const APP_SHELL_CACHE_CONTROL =
  "public, max-age=0, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400";

const appShellContentCache = new Map<string, Promise<string>>();

export interface AppShellSeo {
  path: string;
  title: string;
  description: string;
  schemaJson?: string;
  crawlableHtml?: string;
  /**
   * Keep this page out of search results while leaving it open to readers and
   * to crawlers following its links.
   */
  noindex?: boolean;
}

export async function renderHtmlContent(
  htmlPath: string,
  seo?: AppShellSeo,
): Promise<string> {
  const htmlContent = await fs.readFile(htmlPath, "utf-8");
  const assetManifest = await getRuntimeAssetManifest();
  const cdnBase = ServerEnv.cdnBase();
  const siteOrigin = ServerEnv.authOrigin().replace(/\/+$/, "");
  const routeSeo: Required<AppShellSeo> = {
    path: seo?.path ?? "/",
    title: seo?.title ?? "OpenBack",
    description:
      seo?.description ??
      "Play OpenBack, an online territorial war RTS. Expand nations, command armies, build an economy, form alliances, and conquer a world map.",
    schemaJson: seo?.schemaJson ?? "{}",
    crawlableHtml: seo?.crawlableHtml ?? "",
    noindex: seo?.noindex ?? false,
  };
  return ejs.render(htmlContent, {
    gitCommit: JSON.stringify(ServerEnv.gitCommit()),
    assetManifest: JSON.stringify(assetManifest),
    cdnBase: JSON.stringify(cdnBase),
    // Raw (unquoted) value for use as a URL prefix in the index.html template,
    // e.g. <script src="<%- cdnBaseRaw %>/assets/index-XXX.js">. The Vite
    // build plugin inject-cdn-base-template rewrites Vite's emitted /assets/
    // refs to use this placeholder.
    cdnBaseRaw: cdnBase,
    gameEnv: JSON.stringify(ServerEnv.gameEnvName()),
    numWorkers: JSON.stringify(ServerEnv.numWorkers()),
    turnstileSiteKey: JSON.stringify(ServerEnv.turnstileSiteKey()),
    jwtAudience: JSON.stringify(ServerEnv.jwtAudience()),
    authOrigin: JSON.stringify(ServerEnv.authOrigin()),
    googleEnabled: JSON.stringify(
      Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    ),
    instanceId: JSON.stringify(ServerEnv.instanceId()),
    shareOrigin: JSON.stringify(ServerEnv.shareOrigin()),
    siteOrigin,
    seoTitle: routeSeo.title,
    seoDescription: routeSeo.description,
    seoCanonical: `${siteOrigin}${routeSeo.path}`,
    seoRobots: routeSeo.noindex ? "noindex, follow" : "index, follow",
    seoSchemaJson: routeSeo.schemaJson,
    seoCrawlableHtml: routeSeo.crawlableHtml,
    manifestHref: buildAssetUrl("manifest.json", assetManifest, cdnBase),
    markPngHref: buildAssetUrl(
      "images/OpenBackMark512.png",
      assetManifest,
      cdnBase,
    ),
    // Absolute: link-preview crawlers cannot resolve a site-relative path.
    socialPreviewUrl: toAbsoluteAssetUrl(
      buildAssetUrl("images/OpenBackSocialPreview.png", assetManifest, cdnBase),
      siteOrigin,
    ),
    backgroundImageUrl: buildAssetUrl(
      "images/background.webp",
      assetManifest,
      cdnBase,
    ),
    desktopLogoImageUrl: buildAssetUrl(
      "images/OpenBackLogo.svg",
      assetManifest,
      cdnBase,
    ),
    mobileLogoImageUrl: buildAssetUrl(
      "images/OpenBackMark.svg",
      assetManifest,
      cdnBase,
    ),
  });
}

export async function getAppShellContent(
  htmlPath: string,
  seo?: AppShellSeo,
): Promise<string> {
  const cacheKey = `${htmlPath}\0${seo?.path ?? "/"}`;
  let cachedContent = appShellContentCache.get(cacheKey);
  if (!cachedContent) {
    cachedContent = renderHtmlContent(htmlPath, seo).catch((error: unknown) => {
      appShellContentCache.delete(cacheKey);
      throw error;
    });
    appShellContentCache.set(cacheKey, cachedContent);
  }
  return cachedContent;
}

export function clearAppShellContentCache(): void {
  appShellContentCache.clear();
}

export function setAppShellCacheHeaders(res: Response): void {
  res.setHeader("Cache-Control", APP_SHELL_CACHE_CONTROL);
  res.setHeader("Content-Type", "text/html");
}

export function setHtmlNoCacheHeaders(res: Response): void {
  setNoStoreHeaders(res);
  res.setHeader("ETag", "");
  res.setHeader("Content-Type", "text/html");
}

export async function renderAppShell(
  res: Response,
  htmlPath: string,
  seo?: AppShellSeo,
): Promise<void> {
  const rendered = await getAppShellContent(htmlPath, seo);
  setAppShellCacheHeaders(res);
  res.send(rendered);
}
