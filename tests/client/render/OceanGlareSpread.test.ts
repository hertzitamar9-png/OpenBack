import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { flowAnimation } from "../../../src/client/render/gl/passes/TerrainPass";

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
    expect(shader).toContain("waterFlow * 0.55 * seaDetail");
    expect(shader).not.toContain("float openGlare");
  });

  it("draws four finite curved paths instead of periodic sea-wide stripes", () => {
    expect(shader.match(/coastFlowLayer\(/g)).toHaveLength(5);
    expect(shader).toContain("float curvedCenter = sin(");
    expect(shader).toContain("float normalizedSide = clamp(");
    expect(shader).toContain(
      "float endFade = 1.0 - smoothstep(halfLength * 0.62, halfLength",
    );
    expect(shader).toContain("return ribbonTerm * endFade * life;");
  });

  it("generates changing normalized directions, positions, speeds, and curves", () => {
    const first = flowAnimation(8, 4096, 2048);
    const next = flowAnimation(9, 4096, 2048);
    const travelDistances = first.centerX.map((x, index) =>
      Math.hypot(
        next.centerX[index] - x,
        next.centerY[index] - first.centerY[index],
      ),
    );

    for (let i = 0; i < 4; i++) {
      expect(Math.hypot(first.directionX[i], first.directionY[i])).toBeCloseTo(
        1,
        5,
      );
      expect(first.curve[i]).toBeGreaterThanOrEqual(12);
      expect(first.curve[i]).toBeLessThanOrEqual(32);
    }
    expect(
      new Set(Array.from(travelDistances, (distance) => distance.toFixed(3)))
        .size,
    ).toBe(4);
  });

  it("fades a flow fully out before assigning its next random generation", () => {
    // Flow zero: seed .71, duration 19, so generation 1 begins here.
    const boundary = (1 - 0.71) * 19;
    const before = flowAnimation(boundary - 0.001, 4096, 2048);
    const after = flowAnimation(boundary + 0.001, 4096, 2048);

    expect(before.life[0]).toBeCloseTo(0, 5);
    expect(after.life[0]).toBeCloseTo(0, 5);
    expect(after.centerX[0]).not.toBeCloseTo(before.centerX[0], 2);
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
