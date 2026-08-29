import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pathForTarget } from "../../src/client/AppRoutes";

/**
 * The whole game answers at one address.
 *
 * The tutorials and the blog are pages inside the app, reached without leaving
 * "/" -- their text comes from /api/openback/content, not from the address.
 * They used to have addresses of their own anyway, so a search for OpenBack
 * came back with a stack of entries for the same game. Those addresses are now
 * earlier spellings of the home page and redirect to it permanently, which
 * also tells a search engine to fold what they earned into the home page
 * rather than list them beside it.
 */
describe("one address for the game", () => {
  const master = readFileSync("src/server/Master.ts", "utf8");

  it("redirects every article address to the home page", () => {
    const block = master.slice(
      master.indexOf("// Everything the game has lives at one address."),
      master.indexOf("RENAMED_LEGAL_PAGES"),
    );
    for (const path of [
      '"/guides"',
      '"/guides/{*rest}"',
      '"/tutorials"',
      '"/tutorials/{*rest}"',
      '"/blog"',
      '"/blog/{*rest}"',
    ]) {
      expect(block).toContain(path);
    }
    expect(block).toMatch(/res\.redirect\(301, "\/"\)/);
  });

  it("no longer serves those addresses as pages of their own", () => {
    expect(master).not.toContain("app.get(OPENBACK_CONTENT_PATHS");
    expect(master).not.toContain("getOpenBackContentSeo");
  });

  it("keeps the in-app content API, which is where the text comes from", () => {
    expect(master).toContain('app.get("/api/openback/content"');
  });

  it("lists only the home page in the sitemap", () => {
    expect(master).toMatch(/const urls = \["\/"\]/);
  });

  it("never puts an article address in the address bar", () => {
    expect(pathForTarget({ pageId: "page-tutorials" })).toBe("/");
    expect(
      pathForTarget({ pageId: "page-tutorials", article: "getting-started" }),
    ).toBe("/");
    expect(pathForTarget({ pageId: "page-blog" })).toBe("/");
    expect(
      pathForTarget({
        pageId: "page-blog",
        article: "world-map-conquest-games",
      }),
    ).toBe("/");
  });

  it("still keeps the legal pages at their own addresses", () => {
    // Those are real pages people are sent to on purpose, not duplicates of
    // the game, so flattening does not apply to them.
    expect(pathForTarget({ pageId: "page-terms" })).toBe("/");
    expect(master).toContain('"/terms-of-service": "/terms"');
  });
});
