import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shader = (name: string) =>
  readFileSync(
    resolve(process.cwd(), "src/client/render/gl/shaders/name", name),
    "utf8",
  );

describe("3D label shaders", () => {
  it.each(["name.vert.glsl", "icon.vert.glsl", "status-icon.vert.glsl"])(
    "renders %s with the same fixed screen scale as 2D",
    (name) => {
      const source = shader(name);
      expect(source).toContain("uniform vec2 uScreenFacingScale");
      expect(source).toContain("uScreenFacingScale");
      expect(source).toContain("MAX_SCREEN_SIZE");
      expect(source).toContain("scaleCorrection");
      expect(source).not.toContain("xH.xy");
    },
  );

  it("keeps the established 2D name fill in 3D", () => {
    const source = shader("name.frag.glsl");
    expect(source).toContain("vec3 defaultFill = vec3(vNameShade)");
    expect(source).not.toContain("uScreenFacing == 1 ?");
  });

  it("discards empty MSDF atlas padding in 3D instead of tinting glyph boxes", () => {
    const vertex = shader("name.vert.glsl");
    const fragment = shader("name.frag.glsl");
    expect(vertex).toContain("vScreenFacing = float(uScreenFacing)");
    expect(fragment).toContain("vScreenFacing > 0.5 && sd < 0.12");
  });

  it("keeps world numbers screen-facing in 3D", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/client/render/gl/shaders/world-text/world-text.vert.glsl",
      ),
      "utf8",
    );
    expect(source).toContain("uniform int uScreenFacing");
    expect(source).toContain("uniform vec2 uScreenFacingScale");
    expect(source).toContain("MAX_SCREEN_SIZE");
    const levels = readFileSync(
      resolve(
        process.cwd(),
        "src/client/render/gl/shaders/structure-level/structure-level.vert.glsl",
      ),
      "utf8",
    );
    expect(levels).toContain("uniform int uScreenFacing");
    expect(levels).toContain("uniform vec2 uScreenFacingScale");
    expect(levels).toContain("MAX_SCREEN_SIZE");
  });
});
