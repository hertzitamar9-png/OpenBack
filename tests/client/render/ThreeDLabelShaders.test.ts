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
    "caps %s in screen-facing mode",
    (name) => {
      const source = shader(name);
      expect(source).toContain("uScreenFacing == 1 && screenSize > 0.085");
      expect(source).toContain("screenSize = 0.085");
    },
  );

  it("uses a legible light name fill only for the 3D screen-facing path", () => {
    const source = shader("name.frag.glsl");
    expect(source).toContain(
      "uScreenFacing == 1 ? vec3(0.96) : vec3(vNameShade)",
    );
  });
});
