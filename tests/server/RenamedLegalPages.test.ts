import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The legal pages live at /terms and /privacy, but their older names are what
 * is linked from elsewhere and what search engines went looking for. Those
 * used to fall through to the SPA handler, which answered with the home page
 * -- a crawler reads that as the page not existing, which is why Search
 * Console reported /terms-of-service as not on Google.
 *
 * Each old name must redirect, and every destination must be a route the app
 * actually has, so a later rename cannot leave a redirect pointing at nothing.
 */
describe("renamed legal pages", () => {
  const master = readFileSync("src/server/Master.ts", "utf8");
  const routes = readFileSync("src/client/AppRoutes.ts", "utf8");

  const block = master.slice(
    master.indexOf("const RENAMED_LEGAL_PAGES"),
    master.indexOf("};", master.indexOf("const RENAMED_LEGAL_PAGES")),
  );

  const pairs = block
    .split("\n")
    .map((line) => line.match(/"([^"]+)":\s*"([^"]+)"/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ from: m[1], to: m[2] }));

  it("covers the names the site was indexed under", () => {
    const from = pairs.map((p) => p.from);
    expect(from).toContain("/terms-of-service");
    expect(from).toContain("/privacy-policy");
  });

  it("redirects permanently, so the old address stops being indexed", () => {
    expect(master).toMatch(/res\.redirect\(301, destination\)/);
  });

  it.each(pairs)("sends $from to a route that exists: $to", ({ to }) => {
    expect(routes).toContain(`["${to}", {`);
  });

  it("never redirects a path onto itself", () => {
    for (const { from, to } of pairs) expect(from).not.toBe(to);
  });
});
