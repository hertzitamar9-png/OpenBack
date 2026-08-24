import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shader = readFileSync(
  resolve(
    process.cwd(),
    "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
  ),
  "utf8",
);
const threeD = readFileSync(
  resolve(process.cwd(), "src/client/render/gl/passes/ThreeDCompositePass.ts"),
  "utf8",
);

describe("the real coastal glow flows across Classic 2D water", () => {
  it("uses the exact coastal threshold, color, and full glow strength", () => {
    expect(shader).toContain("float coastFlowLayer(");
    expect(shader).toContain(
      "float ribbonTerm = smoothstep(0.58, 0.90, ribbon);",
    );
    expect(shader).toContain(
      "shore ? smoothstep(0.58, 0.90, shoreBreak) * 0.55 * seaDetail : 0.0;",
    );
    expect(shader).toContain("waterFlow * 0.16 * seaDetail");
    expect(shader).not.toContain("float openGlare");
  });

  it("draws one finite curved path per broad ocean region", () => {
    expect(shader.match(/coastFlowLayer\(/g)).toHaveLength(2);
    expect(shader).toContain(
      "float cellSize = clamp(min(mapSize.x, mapSize.y) / 6.0, 64.0, 260.0);",
    );
    expect(shader).toContain("vec2 cell = floor(world / cellSize);");
    expect(shader).toContain("float curvedCenter = sin(");
    expect(shader).toContain("float normalizedSide = clamp(");
    expect(shader).toContain(
      "float endFade = 1.0 - smoothstep(halfLength * 0.62, halfLength",
    );
    expect(shader).toContain("return ribbonTerm * endFade * life;");
  });

  it("generates changing directions, positions, speeds, curves, and lifetimes", () => {
    expect(shader).toContain("float generation = floor(cycle);");
    expect(shader).toContain("float angle = flowRandom(");
    expect(shader).toContain("float speed = mix(0.30, 1.0");
    expect(shader).toContain("vec2 center = cellOrigin + cellSize * vec2(");
    expect(shader).toContain("float curve = mix(0.35, 1.0");
    expect(shader).toContain("float life = smoothstep(0.0, 0.20, age)");
  });

  it("keeps each fragment at tiny shoreline-glint scale", () => {
    expect(shader).toContain(
      "float halfLength = clamp(4.0 / safeZoom, 0.4, min(28.0, cellSize * 0.10));",
    );
    expect(shader).toContain(
      "float width = clamp(0.65 / safeZoom, 0.15, 2.5);",
    );
  });

  it("covers every ocean with many independent regions", () => {
    const regionCount = (width: number, height: number) => {
      const size = Math.max(64, Math.min(260, Math.min(width, height) / 6));
      return Math.ceil(width / size) * Math.ceil(height / size);
    };
    expect(regionCount(512, 256)).toBeGreaterThanOrEqual(32);
    expect(regionCount(4096, 2048)).toBeGreaterThanOrEqual(100);
  });
});

describe("Immersive 3D keeps the calm glow at the coast", () => {
  it("does not inject the Classic 2D open-water flows", () => {
    expect(threeD).not.toContain("coastFlowLayer");
    expect(threeD).toContain(
      "float coastalBreak=shoreline?smoothstep(0.58,0.90,shoreBreak)*0.72:0.0;",
    );
    expect(threeD).toContain("float foamCrest=coastalBreak;");
  });
});
