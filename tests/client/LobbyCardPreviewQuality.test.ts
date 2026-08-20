import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FetchGameMapLoader } from "../../src/core/game/FetchGameMapLoader";
import { GameMapType } from "../../src/core/game/Game";

describe("Twin World lobby preview quality", () => {
  it("exposes density-aware Classic and Immersive sources", () => {
    const map = new FetchGameMapLoader("/maps").getMapData(GameMapType.World);
    expect(map.webpPath).toContain("thumbnail.webp");
    expect(map.webp2xPath).toContain("thumbnail@2x.webp");
    expect(map.webp3dPath).toContain("thumbnail-3d.webp");
    expect(map.webp3d2xPath).toContain("thumbnail-3d@2x.webp");
  });

  it("renders a 2x srcset and uses the selected experience artwork", () => {
    const source = readFileSync("src/client/GameModeSelector.ts", "utf8");
    expect(source).toContain('srcset="${mapImageSrcset}"');
    expect(source).toContain("mapData.webp3dPath");
    expect(source).toContain("mapData.webp3d2xPath");
  });

  it("regenerates the committed preview variants after authoritative maps", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["gen-maps"]).toContain(
      "node scripts/generate-twin-thumbnails.mjs",
    );
  });
});
