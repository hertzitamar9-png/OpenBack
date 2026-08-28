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
    // Sized 1/zoom, so a glint stays the same size on screen at any zoom.
    expect(shader).toContain("float halfLength = clamp(4.0 / safeZoom,");
    expect(shader).toContain("float width = clamp(0.65 / safeZoom,");
  });

  it("does not clip that scale on a phone", () => {
    // uZoom is device pixels per tile, so a handset showing a whole map sits
    // near 0.2 where a desktop sits near 1.7, and it therefore asks for a
    // glint several tiles across. The old ceilings -- width 2.5, length
    // min(28, cell*0.10) -- sat below what a phone asks for and above what a
    // desktop ever asks for, so only phones were cut: on the giant map a width
    // of 6.09 tiles became 2.50, 59% too thin. That is why the sea read
    // differently there. The ceilings must clear a handset's real request.
    const NEWLINE = String.fromCharCode(10);
    const clampLine = (name: string): string => {
      const line = shader
        .split(NEWLINE)
        .find((l) => l.includes("float " + name + " = clamp("));
      if (line === undefined) throw new Error("no " + name + " clamp found");
      return line;
    };
    const numbers = (text: string): number[] =>
      text
        .split(/[^0-9.]+/)
        .filter((piece) => piece.length > 0 && piece !== ".")
        .map(Number);

    // A phone on the giant map wants 0.65 / 0.11 = 6.09 tiles of width.
    const widthCeiling = numbers(clampLine("width")).pop() ?? 0;
    expect(widthCeiling).toBeGreaterThanOrEqual(6.09);

    // ...and 4.0 / 0.11 = 37.5 tiles of half-length. The giant map's cell is
    // 260 tiles, so both the flat cap and the cell-relative one must clear it.
    const lengthNumbers = numbers(clampLine("halfLength"));
    const flatCap = lengthNumbers[lengthNumbers.length - 2] ?? 0;
    const cellFactor = lengthNumbers[lengthNumbers.length - 1] ?? 0;
    expect(flatCap).toBeGreaterThanOrEqual(37.5);
    expect(260 * cellFactor).toBeGreaterThanOrEqual(37.5);
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
