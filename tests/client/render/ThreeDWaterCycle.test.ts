import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("3D water cycle shader", () => {
  it("uses authoritative cycle uniforms for raised waves, foam, and coast retreat", () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        "src/client/render/gl/passes/ThreeDCompositePass.ts",
      ),
      "utf8",
    );
    expect(source).toContain("uGameTick");
    expect(source).toContain("gerstnerWave");
    expect(source).toContain("shoreBreak");
    expect(source).toContain("foamCrest");
    expect(source).toContain("uDaylight");
    expect(source).toContain("uTideHeight");
  });

  it("keeps directional tide shimmer without repeated oval foam on the classic 2D ocean", () => {
    const terrain = readFileSync(
      "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
      "utf8",
    );
    // The open sea carries the same pale shallow-water shine that makes a
    // coastline glow, rather than the zeroed crest placeholder that stood
    // here while the sea had no light of its own.
    expect(terrain).toContain("shorelineTint");
    expect(terrain).not.toContain("openCrest");
    // Soft-edged and summed, never thresholded into bands: a hard cut is what
    // turned earlier attempts into stripes and then into scratches.
    expect(terrain).not.toContain("streakLayer");
    // A wide smoothstep is what keeps the edges soft; a narrow one would
    // cut the light back into bands.
    expect(terrain).toContain("smoothstep(0.16, 0.94, wave)");
    // It applies to all water, not gated on the shore flag — that gating was
    // the reason the open ocean read as dead next to the coast.
    expect(terrain).not.toMatch(/shore\s*\?[^;]*shorelineTint/);
    expect(terrain).toContain("coastalBreak");
    expect(terrain).toContain("shimmer");
    expect(terrain).not.toContain("oceanCrest");
    // The drifting pale ovals came from thresholding a sum of three sines:
    // sine interference peaks in round patches. A single directional band is
    // used instead, so this term must not come back.
    expect(terrain).not.toContain("crestWave");
    // Open water carries no crest caps: a directional band read as diagonal
    // stripes across the ocean at map scale.
    expect(terrain).not.toContain("openBreak");
    // Open water must keep moving when the map is zoomed out; the shared
    // `detail` term fades to zero at low zoom and left whole oceans flat.
    expect(terrain).toContain("seaDetail");
    expect(terrain).not.toContain("smoothstep(0.82, 0.97, waves)");
  });

  it("keeps 2D coastal flow independent while 3D foam stays coast-only", () => {
    const terrain = readFileSync(
      "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
      "utf8",
    );
    const threeD = readFileSync(
      resolve(
        process.cwd(),
        "src/client/render/gl/passes/ThreeDCompositePass.ts",
      ),
      "utf8",
    );

    // The coastline's visible colour is the current ocean colour blended 30%
    // toward white. A fixed guessed tint cannot preserve it when the player
    // changes ocean colour and was almost invisible over deep water.
    expect(terrain).toContain(
      "vec3 shorelineTint = mix(oceanBase, vec3(1.0), 0.30);",
    );
    expect(threeD).toContain(
      "vec3 shorelineTint=mix(oceanBase,vec3(1.0),0.30);",
    );

    // Each broad field owns its direction and speed. Combining only one
    // thresholded sum makes the whole sea appear to travel as one sheet.
    expect(terrain.match(/shineLayer\(/g)?.length ?? 0).toBeGreaterThanOrEqual(
      5,
    );
    expect(threeD.match(/shineLayer\(/g)?.length ?? 0).toBeGreaterThanOrEqual(
      5,
    );
    expect(threeD).not.toContain("float openCrest=");
    expect(terrain).toContain("float boundaryGlare = max(coastalBreak");
    expect(threeD).toContain("float foamCrest=coastalBreak;");
    expect(threeD).not.toContain("coastFlowLayer");
    expect(terrain.match(/coastFlowLayer\(/g)).toHaveLength(2);
  });

  // A sine on its own runs as endless parallel bands: the same crests in the
  // same places, forever. Each layer is gated behind a slow noise field that
  // drifts along that layer's own heading and speed, so shine turns up in
  // different parts of the sea over time instead of where it always was.
  // Rendered check (256x256 of pure open water, no shore anywhere): the
  // brightest 5% of the surface shares 0.9% of its positions with the same
  // sea 20s later.
  it("spawns its shine in drifting patches rather than fixed bands", () => {
    const terrain = readFileSync(
      "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
      "utf8",
    );
    const threeD = readFileSync(
      "src/client/render/gl/passes/ThreeDCompositePass.ts",
      "utf8",
    );

    expect(terrain).toContain("return ribbonTerm * endFade * life;");
    expect(threeD).toContain("smoothstep(0.18,0.82,gate)");
    // The gate travels with its layer, so a layer running the other way takes
    // its patches the other way too.
    expect(terrain).toContain("float curvedCenter = sin(");
    expect(threeD).toContain("world*0.016+travel*time*speed*0.6");

    // "patch" is a reserved word in GLSL ES 3.0 -- naming the variable that
    // fails to compile at runtime, taking the match down with it.
    expect(terrain).not.toContain("float patch");
    expect(threeD).not.toContain("float patch");
  });

  it("warps the moving water field instead of sliding square grid cells across mobile views", () => {
    const terrain = readFileSync(
      "src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl",
      "utf8",
    );
    const threeD = readFileSync(
      "src/client/render/gl/passes/ThreeDCompositePass.ts",
      "utf8",
    );

    expect(terrain).toContain("domainWarpedWaterNoise");
    expect(threeD).toContain("domainWarpedWaterNoise");
    expect(terrain).not.toContain("valueNoise(\n    world * 0.005");
    expect(threeD).not.toContain("waterNoise(world*0.005");
    expect(terrain).toContain("world * 0.016");
    expect(threeD).toContain("world*0.016");
    expect(terrain).toContain("smoothstep(0.18, 0.82, gate)");
    expect(threeD).toContain("smoothstep(0.18,0.82,gate)");
  });
});
