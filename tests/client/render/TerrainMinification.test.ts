import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The terrain must be averaged when it is drawn smaller than it is.
 *
 * uZoom is device pixels per tile. A desktop showing a whole map sits near
 * 1.73, so a screen pixel covers well under one tile -- magnification, where
 * NEAREST is exactly right and the map stays sharp. A phone sits near 0.22,
 * where one pixel covers about 4.6 tiles across and twenty in area, and
 * NEAREST returns one of those twenty. Which one changes as the camera moves,
 * so the sea crawled with square specks on a handset while a desktop was
 * clean. Minification reads the mip chain instead, which averages them.
 */
const pass = readFileSync("src/client/render/gl/passes/TerrainPass.ts", "utf8");
const utils = readFileSync("src/client/render/gl/utils/GlUtils.ts", "utf8");

const colourTexture = pass.slice(
  pass.indexOf("this.tex = createTexture2D("),
  pass.indexOf("this.terrainByteTex = createTexture2D("),
);

describe("terrain texture minification", () => {
  it("keeps NEAREST when magnified, so a zoomed-in map stays crisp", () => {
    expect(colourTexture).toMatch(/filter: gl\.NEAREST/);
  });

  it("averages through the mip chain when minified", () => {
    expect(colourTexture).toMatch(/minFilter: gl\.LINEAR_MIPMAP_LINEAR/);
    expect(colourTexture).toMatch(/mipmap: true/);
  });

  it("actually builds the chain it asks for", () => {
    // A *_MIPMAP_* minification filter on a texture with no mip levels makes
    // the texture incomplete, and it samples as solid black.
    expect(utils).toMatch(/if \(opts\.mipmap\) gl\.generateMipmap/);
  });

  it("can filter the two directions differently", () => {
    expect(utils).toMatch(/opts\.minFilter \?\? opts\.filter \?\? gl\.NEAREST/);
  });

  it("leaves the integer terrain-byte texture point sampled", () => {
    // R8UI is not filterable, and the shader reads it with texelFetch for
    // land/shore decisions -- averaging those would invent terrain types.
    const byteTexture = pass.slice(
      pass.indexOf("this.terrainByteTex = createTexture2D("),
    );
    expect(byteTexture.slice(0, 400)).toMatch(/filter: gl\.NEAREST/);
    expect(byteTexture.slice(0, 400)).not.toMatch(/MIPMAP/);
  });

  it("rebuilds the chain after every edit, coalesced to one a frame", () => {
    const uploads = pass.match(/gl\.texSubImage2D\(/g) ?? [];
    const marks = pass.match(/this\.mipsDirty = true;/g) ?? [];
    expect(uploads.length).toBeGreaterThan(0);
    expect(marks.length).toBe(uploads.length);
    expect(pass).toMatch(/if \(this\.mipsDirty\)[\s\S]{0,400}generateMipmap/);
  });
});
