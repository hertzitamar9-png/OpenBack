import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  applyStaticAssetCacheControl,
  getStaticAssetCacheControl,
} from "../../src/server/StaticAssetCache";

describe("StaticAssetCache", () => {
  test("marks Vite asset namespace as immutable", () => {
    expect(getStaticAssetCacheControl("/assets/index-abc123.js")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  test("marks custom hashed asset namespace as immutable", () => {
    expect(
      getStaticAssetCacheControl("/_assets/maps/world/manifest.hash.json"),
    ).toBe("public, max-age=31536000, immutable");
  });

  test("marks generated asset namespaces noindex without blocking crawling", () => {
    const headers = new Map<string, string>();
    applyStaticAssetCacheControl(
      (name, value) => headers.set(name, value),
      "/_assets/changelog.hash.md",
    );
    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(headers.get("Cache-Control")).toBe(
      "public, max-age=31536000, immutable",
    );

    const nginx = readFileSync("nginx.conf", "utf8");
    expect(nginx.match(/add_header X-Robots-Tag/g)).toHaveLength(3);
  });

  test("does not mark other paths as immutable", () => {
    expect(getStaticAssetCacheControl("/manifest.json")).toBeUndefined();
    expect(getStaticAssetCacheControl("/api/health")).toBeUndefined();
  });

  test("forces revalidation for dynamic root files", () => {
    expect(getStaticAssetCacheControl("/cosmetics.json")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(getStaticAssetCacheControl("/news.json")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(getStaticAssetCacheControl("/favicon.png")).toBe(
      "public, max-age=0, must-revalidate",
    );
    expect(getStaticAssetCacheControl("/cosmetics.json?v=1")).toBe(
      "public, max-age=0, must-revalidate",
    );
  });

  test("never stores navigable legal documents", () => {
    expect(getStaticAssetCacheControl("/privacy-policy.html")).toBe("no-store");
    expect(getStaticAssetCacheControl("/terms-of-service.html?v=current")).toBe(
      "no-store",
    );
  });
});
