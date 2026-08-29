import { describe, expect, it } from "vitest";
import { OPENBACK_CONTENT_PATHS } from "../../src/server/OpenBackContent";

/**
 * An article address that does not exist must say so.
 *
 * Anything under /blog or /tutorials that is not a real page used to fall
 * through to the SPA handler, which answered 200 with the home page's title
 * and a canonical pointing at "/". Every mistyped or stale article URL
 * therefore became another indexable page claiming to be a copy of the home
 * page, which is the same soft-404 problem that got the site flagged for
 * hosting downloads it did not have.
 */
const isRealArticle = (path: string) => OPENBACK_CONTENT_PATHS.includes(path);

describe("unknown article addresses", () => {
  it("serves the articles that exist", () => {
    expect(isRealArticle("/blog/world-map-conquest-games")).toBe(true);
    expect(isRealArticle("/tutorials/getting-started")).toBe(true);
    expect(isRealArticle("/blog")).toBe(true);
    expect(isRealArticle("/tutorials")).toBe(true);
  });

  it.each([
    "/blog/this-does-not-exist",
    "/blog/world-map-conquest-deep-strategy",
    "/tutorials/nope",
    "/blog/world-map-conquest-games-extra",
  ])("refuses %s", (path) => {
    expect(isRealArticle(path)).toBe(false);
  });

  it("lists the canonical tutorial paths, not the old /guides ones", () => {
    const tutorialPaths = OPENBACK_CONTENT_PATHS.filter((p) =>
      p.startsWith("/tutorials/"),
    );
    expect(tutorialPaths.length).toBeGreaterThan(0);
    expect(OPENBACK_CONTENT_PATHS.some((p) => p.startsWith("/guides"))).toBe(
      false,
    );
  });
});
