import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getOpenBackContentSeo } from "../../src/server/OpenBackContent";

/**
 * A search for OpenBack should answer with OpenBack, once.
 *
 * The tutorial and blog pages are all about the same game as the home page, so
 * a search was coming back with several of them stacked together instead of
 * the game itself. They stay readable and stay crawled -- "follow" keeps their
 * links counting -- but they no longer stand as separate answers, and the
 * sitemap no longer asks for them to be.
 */
describe("one result for the game", () => {
  const origin = "https://openback.dedyn.io";

  it.each([
    "/tutorials",
    "/blog",
    "/tutorials/getting-started",
    "/blog/world-map-conquest-games",
  ])("keeps %s out of search results", (path) => {
    const seo = getOpenBackContentSeo(path, origin);
    expect(seo).not.toBeNull();
    expect(seo!.noindex).toBe(true);
  });

  it("still gives those pages their own subject and canonical", () => {
    // noindex is not an excuse to serve them as copies of each other.
    const a = getOpenBackContentSeo("/tutorials/getting-started", origin)!;
    const b = getOpenBackContentSeo("/blog/world-map-conquest-games", origin)!;
    expect(a.description).not.toBe(b.description);
    expect(a.headline).not.toBe(b.headline);
    expect(a.path).not.toBe(b.path);
  });

  it("lists only the home page in the sitemap", () => {
    const master = readFileSync("src/server/Master.ts", "utf8");
    expect(master).toMatch(/const urls = \["\/"\]/);
    expect(master).not.toMatch(
      /const urls = \["\/", \.\.\.OPENBACK_CONTENT_PATHS\]/,
    );
  });

  it("leaves the app shell indexable by default", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toContain('<meta name="robots" content="<%= seoRobots %>" />');
    const render = readFileSync("src/server/RenderHtml.ts", "utf8");
    // A route that says nothing about indexing stays indexable.
    expect(render).toMatch(/noindex: seo\?\.noindex \?\? false/);
    expect(render).toMatch(/"noindex, follow" : "index, follow"/);
  });
});
