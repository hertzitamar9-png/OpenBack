import { createHash } from "node:crypto";
import cosmetics from "../resources/cosmetics.json";

const visualSections = [
  cosmetics.flags,
  cosmetics.skins,
  cosmetics.crowns,
] as const;

function decodeSvg(url: string): string | null {
  const prefix = "data:image/svg+xml;base64,";
  if (!url.startsWith(prefix)) return null;
  return Buffer.from(url.slice(prefix.length), "base64").toString("utf8");
}

function structureSignature(svg: string): string {
  const normalized = svg
    .replace(/#[0-9a-f]{3,8}/gi, "#COLOR")
    .replace(/hsl\([^)]*\)/gi, "COLOR")
    .replace(/(?:stop-)?opacity="[^"]*"/g, 'opacity="VALUE"')
    .replace(/rotate\([^)]*\)/g, "rotate(VALUE)")
    .replace(/scale\([^)]*\)/g, "scale(VALUE)");
  return createHash("sha256").update(normalized).digest("hex");
}

describe("OpenBack shop catalog", () => {
  it("gives every image item its own artwork", () => {
    const urls: string[] = [];
    for (const section of visualSections) {
      for (const item of Object.values(section)) urls.push(item.url);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("does not reuse an SVG structure as a recolor", () => {
    const signatures: string[] = [];
    for (const section of visualSections) {
      for (const item of Object.values(section)) {
        const svg = decodeSvg(item.url);
        if (svg !== null) signatures.push(structureSignature(svg));
      }
    }
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it("gives every listed visual and effect a rarity and wallet price", () => {
    const items = [
      ...visualSections.flatMap((section) => Object.values(section)),
      ...Object.values(cosmetics.effects).flatMap((group) =>
        Object.values(group),
      ),
    ];
    for (const item of items) {
      expect(item.rarity).toMatch(
        /^(common|uncommon|rare|epic|legendary|mythic|ultra)$/,
      );
      expect(item.priceSoft).toBeGreaterThan(0);
    }
  });

  it("gives every effect a distinct visual behavior definition", () => {
    const signatures = Object.values(cosmetics.effects).flatMap((group) =>
      Object.values(group).map((item) =>
        JSON.stringify({ effectType: item.effectType, ...item.attributes }),
      ),
    );
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
