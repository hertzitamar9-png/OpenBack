import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shader = (path: string) =>
  readFileSync(
    resolve(process.cwd(), "src/client/render/gl/shaders", path),
    "utf8",
  );

describe("3D tactical overlay projection", () => {
  it.each([
    "shared/map-quad.vert.glsl",
    "crosshair/crosshair.vert.glsl",
    "fx/attack-ring.vert.glsl",
    "fx/shockwave.vert.glsl",
    "fx/sprite.vert.glsl",
    "map-overlay/spiral-ribbon.vert.glsl",
    "move-indicator/move-indicator.vert.glsl",
    "nuke-trajectory/nuke-trajectory.vert.glsl",
    "nuke-trajectory/nuke-trajectory-marker.vert.glsl",
    "range-circle/range-circle.vert.glsl",
    "sam-radius/sam-radius.vert.glsl",
    "selection-box/selection-box.vert.glsl",
    "bar/bar.vert.glsl",
    "structure/structure.vert.glsl",
    "unit/unit.vert.glsl",
  ])(
    "perspective-divides and culls unsafe %s anchors instead of expanding across the screen",
    (path) => {
      expect(shader(path)).toContain("clip.z <= 0.0001");
      expect(shader(path)).toContain("clip.xy / clip.z");
      expect(shader(path)).not.toContain("clip.xy / max(0.0001, clip.z)");
    },
  );
});
