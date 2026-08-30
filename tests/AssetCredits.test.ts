import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const credits = readFileSync("CREDITS.md", "utf8");
const cosmetics = JSON.parse(
  readFileSync("resources/cosmetics.json", "utf8"),
) as {
  flags: Record<string, { url: string; artist?: string }>;
  skins: Record<string, { url: string; artist?: string }>;
  crowns: Record<string, { url: string; artist?: string }>;
};
const models = JSON.parse(
  readFileSync("resources/3d/manifest.json", "utf8"),
) as Record<
  string,
  {
    url: string;
    sha256: string;
    license: string;
    sourceUrl: string;
    creator: string;
  }
>;

describe("asset credits", () => {
  it("keeps an individual credit for every imported Wikimedia shop flag", () => {
    const imported = Object.entries(cosmetics.flags).filter(([name]) =>
      name.startsWith("fictional_"),
    );
    const section = credits
      .split("<!-- OPENBACK FICTIONAL FLAGS START -->")[1]
      ?.split("<!-- OPENBACK FICTIONAL FLAGS END -->")[0];

    expect(imported.length).toBeGreaterThan(0);
    expect(section).toBeTruthy();
    expect(section?.match(/^- \[/gm)).toHaveLength(imported.length);
    for (const [name, flag] of imported) {
      expect(flag.url, `${name} must be served from Wikimedia Commons`).toMatch(
        /^https:\/\/upload\.wikimedia\.org\//,
      );
      expect(flag.artist, `${name} must name its creator`).toBeTruthy();
      expect(
        credits,
        `${name} must retain a creator and licence entry in CREDITS.md`,
      ).toContain(`— ${flag.artist}; [`);
    }
  });

  it("credits shop artwork identified as OpenBack work", () => {
    const openBackItems = [
      ...Object.values(cosmetics.flags),
      ...Object.values(cosmetics.skins),
      ...Object.values(cosmetics.crowns),
    ].filter((item) => item.artist === "OpenBack");

    expect(openBackItems.length).toBeGreaterThan(100);
    expect(credits).toContain("OpenBack Shop Artwork");
    expect(credits).toContain("created for OpenBack by **frootz jhklphy**");
    expect(credits).toContain("100 `wrap_*` skins");
  });

  it("keeps complete provenance for every bundled 3D model", () => {
    expect(Object.keys(models)).toHaveLength(22);
    for (const [name, model] of Object.entries(models)) {
      expect(model.url, `${name} must name its local file`).toBeTruthy();
      expect(model.sha256, `${name} must preserve its checksum`).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(model.license, `${name} must name its licence`).toMatch(
        /^(CC0(?:-1\.0)?|CC-BY-3\.0)$/,
      );
      expect(model.sourceUrl, `${name} must link its source`).toMatch(
        /^https:\/\//,
      );
      expect(model.creator, `${name} must name its creator`).toBeTruthy();

      const actualHash = createHash("sha256")
        .update(readFileSync(path.join("resources", model.url)))
        .digest("hex");
      expect(actualHash, `${name} must match its credited checksum`).toBe(
        model.sha256,
      );
    }
  });

  it("credits the independently generated fictional-map replacements", () => {
    expect(credits).toContain("original,\ndeterministic coastlines");
    expect(credits).toContain("The generator reads no\nreference artwork");
    expect(credits).toContain("Atlas 2026, Avidir, Calistis, Canid Continents");
    expect(credits).toContain(
      "Patchwork Earth, Therynian Realms, and World of Lur",
    );
    expect(credits).toContain("docs/map-provenance-audit.md");
    expect(credits).not.toContain("source status remains **unverified**");
    expect(credits).not.toContain("Nothing was traced from anyone's artwork");
  });
});
