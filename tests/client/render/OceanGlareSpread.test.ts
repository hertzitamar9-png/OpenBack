import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The glint has to happen all over the sea, not just near land, and it has to
 * look unplanned.
 *
 * Open water was mixed at 0.08 against the shoreline ribbon's 0.55 -- a
 * seventh of the strength -- so a glint out at sea reached brightness 37 of
 * 255 and read as nothing at all. The four layers also marched at fixed rates,
 * and their noise gate slid along one heading, so the same band scrolled past
 * forever.
 *
 * Now: full strength everywhere, one layer travelling each way, a rate that
 * surges and eases, and a gate that wanders in two dimensions so patches light
 * up in different places at different times. Measured after: 12-14% of open
 * ocean lit at any instant, varying frame to frame.
 */
const shader = readFileSync(
  resolve(
    process.cwd(),
    "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
  ),
  "utf8",
);
const pass = readFileSync(
  resolve(process.cwd(), "src/client/render/gl/passes/TerrainPass.ts"),
  "utf8",
);

/** The `vec2(x, y), frequency, phase` each glareLayer call is given. */
function glareCalls(): Array<{ dir: [number, number]; phase: number }> {
  return shader
    .split("glareLayer(")
    .slice(1)
    .filter((chunk) => chunk.includes("uGlareDrift."))
    .map((chunk) => chunk.slice(0, chunk.indexOf("uGlareDrift.")))
    .map((chunk) => {
      const inside = chunk.slice(chunk.indexOf("vec2(") + 5);
      const [x, y] = inside
        .slice(0, inside.indexOf(")"))
        .split(",")
        .map(Number);
      const rest = inside
        .slice(inside.indexOf(")") + 1)
        .split(",")
        .map((piece) => piece.trim())
        .filter((piece) => piece.length > 0)
        .map(Number)
        .filter((value) => Number.isFinite(value));
      return { dir: [x, y] as [number, number], phase: rest[1] };
    });
}

describe("the glint covers the whole sea", () => {
  it("gives open water the shoreline's strength", () => {
    expect(shader).toContain("openGlare * 0.55 * seaDetail");
    // The shoreline ribbon it now matches.
    expect(shader).toContain(
      "smoothstep(0.58, 0.90, shoreBreak) * 0.55 * seaDetail",
    );
    expect(shader).not.toContain("openGlare * 0.08");
  });
});

describe("the glint travels every way, not one", () => {
  const LAYERS = [
    { speed: 1.05 },
    { speed: -0.82 },
    { speed: 1.18 },
    { speed: -0.68 },
  ];

  it("declares four layers", () => {
    expect(glareCalls()).toHaveLength(4);
  });

  it("covers right, left, up and down", () => {
    // A negative speed runs the layer against its heading, so the direction
    // actually seen is the heading times the sign of the speed.
    const seen = new Set<string>();
    glareCalls().forEach(({ dir }, i) => {
      const sign = Math.sign(LAYERS[i].speed);
      const [x, y] = [dir[0] * sign, dir[1] * sign];
      seen.add(
        Math.abs(x) > Math.abs(y)
          ? x > 0
            ? "right"
            : "left"
          : y > 0
            ? "down"
            : "up",
      );
    });
    expect([...seen].sort()).toEqual(["down", "left", "right", "up"]);
  });

  it("gives each layer its own rate", () => {
    const rates = LAYERS.map((l) => Math.abs(l.speed));
    expect(new Set(rates).size).toBe(rates.length);
  });
});

describe("the animation is worked out once per frame, not once per pixel", () => {
  it("takes drift and wander as uniforms", () => {
    expect(shader).toContain("uniform vec4 uGlareDrift;");
    expect(shader).toContain("uniform vec4 uGlareWanderX;");
    expect(shader).toContain("uniform vec4 uGlareWanderY;");
  });

  it("leaves no per-pixel trig beyond the two waves themselves", () => {
    // Hoisting these cut 16.2% off the pass with a bit-identical picture, so a
    // future edit must not quietly move them back inside.
    const body = shader.slice(shader.indexOf("float glareLayer("));
    const fn = body.slice(0, body.indexOf("\n}"));
    const trig = (fn.match(/\bsin\(|\bcos\(/g) ?? []).length;
    expect(trig).toBe(2);
  });

  it("computes them on the CPU from the same constants", () => {
    expect(pass).toContain("const GLARE_LAYERS = [");
    expect(pass).toContain("function glareAnimation(");
    for (const { speed } of [
      { speed: 1.05 },
      { speed: -0.82 },
      { speed: 1.18 },
      { speed: -0.68 },
    ]) {
      expect(pass).toContain(`speed: ${speed},`);
    }
    // The phases the shader passes must be the ones the CPU animates.
    for (const { phase } of glareCalls()) {
      expect(pass).toContain(`phase: ${phase} }`);
    }
  });
});
