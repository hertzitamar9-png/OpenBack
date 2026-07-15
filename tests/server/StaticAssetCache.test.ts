import { describe, expect, test } from "vitest";
import { getStaticAssetCacheControl } from "../../src/server/StaticAssetCache";

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
});
