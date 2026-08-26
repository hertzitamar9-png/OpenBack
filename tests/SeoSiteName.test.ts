import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

describe("OpenBack search identity", () => {
  test("uses one consistent OpenBack site name with a domain fallback", () => {
    const index = readFileSync("index.html", "utf8");
    const manifest = JSON.parse(
      readFileSync("resources/manifest.json", "utf8"),
    ) as { name?: string; short_name?: string };

    expect(index).toContain('name="application-name" content="OpenBack"');
    expect(index).toContain('property="og:site_name" content="OpenBack"');
    expect(index).toContain('"@type": "WebSite"');
    expect(index).toContain('"name": "OpenBack"');
    expect(index).toContain('"openback.dedyn.io"');
    expect(index.toLowerCase()).not.toContain("desec");
    expect(manifest).toMatchObject({
      name: "OpenBack",
      short_name: "OpenBack",
    });
  });
});
