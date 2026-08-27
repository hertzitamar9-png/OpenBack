import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

/**
 * Google picks the name it shows above a search result from the page's own
 * signals, and `alternateName` is one of the candidates it may display.
 *
 * This file used to require the bare hostname to be listed there as a "domain
 * fallback". That backfired: results were showing "openback.dedyn.io" as the
 * site name instead of OpenBack, because the markup was offering the URL as a
 * legitimate choice. The hostname is already tied to the site by the canonical
 * link, og:url and the WebSite url -- association never needed it, so it is
 * now kept out of the names Google is allowed to display.
 */
describe("OpenBack search identity", () => {
  test("offers Google only OpenBack as a display name", () => {
    const index = readFileSync("index.html", "utf8");
    const manifest = JSON.parse(
      readFileSync("resources/manifest.json", "utf8"),
    ) as { name?: string; short_name?: string };

    expect(index).toContain('name="application-name" content="OpenBack"');
    expect(index).toContain('property="og:site_name" content="OpenBack"');
    expect(index).toContain('"@type": "WebSite"');
    expect(index).toContain('"name": "OpenBack"');
    // The hostname must not be offered as a name Google can display.
    expect(index).not.toContain('"openback.dedyn.io"');
    // ...but it must still be tied to the site, which is what actually
    // stops the result being attributed to the domain's owner.
    expect(index).toContain('rel="canonical"');
    expect(index).toContain('"@type": "Organization"');
    expect(index.toLowerCase()).not.toContain("desec");
    expect(manifest).toMatchObject({
      name: "OpenBack",
      short_name: "OpenBack",
    });
  });
});
