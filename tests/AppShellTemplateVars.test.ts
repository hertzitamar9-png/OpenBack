import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * index.html is rendered by two different things, and both must supply every
 * variable it uses.
 *
 * The server renders it per request through RenderHtml, and vite-plugin-html
 * renders it again for the dev server and the production build. Adding
 * `seoRobots` to the template and to the server alone left the dev server
 * throwing "seoRobots is not defined" on every page load, because the build
 * side has its own separate data object. Neither typecheck nor any unit test
 * caught it -- EJS resolves names at render time.
 */
const html = readFileSync("index.html", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");
const renderHtml = readFileSync("src/server/RenderHtml.ts", "utf8");

/** Every `<%= name %>` / `<%- name %>` in the template, bare identifiers only. */
const used = [
  ...new Set(
    [...html.matchAll(/<%[-=]\s*([A-Za-z_$][\w$]*)\s*%>/g)].map((m) => m[1]),
  ),
].sort();

describe("app shell template variables", () => {
  it("finds the variables the template interpolates", () => {
    expect(used.length).toBeGreaterThan(5);
    expect(used).toContain("seoRobots");
    expect(used).toContain("seoTitle");
  });

  // Plain substring, no regex: a name followed by a colon is how both sides
  // spell a key, and this keeps escaping out of the test itself.
  const defines = (source: string, name: string) =>
    // `name: value` or the shorthand `name,` -- siteOrigin is passed the
    // second way in both files.
    source.includes(name + ":") || source.includes(name + ",");

  it.each(used)("vite.config.ts defines %s", (name) => {
    expect(defines(viteConfig, name)).toBe(true);
  });

  it.each(used)("RenderHtml.ts defines %s", (name) => {
    expect(defines(renderHtml, name)).toBe(true);
  });
});
