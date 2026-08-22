import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSunBlast,
  SUN_BLAST_DETONATION,
  sunBlastAmount,
  triggerSunBlast,
} from "../../../src/client/openback/SunBlast";

const skyShader = () =>
  readFileSync(
    resolve(
      process.cwd(),
      "src/client/render/gl/passes/ThreeDCompositePass.ts",
    ),
    "utf8",
  );

describe("sky", () => {
  it("draws a sun, a moon, stars, clouds and sun rays", () => {
    const src = skyShader();
    expect(src).toContain("sunDisc");
    expect(src).toContain("moonDisc");
    expect(src).toContain("twinkle"); // stars
    expect(src).toContain("clouds");
    expect(src).toContain("rays");
  });

  it("places the moon opposite the sun on the cycle", () => {
    // A shared arc keeps both bodies in the visible band; the half-turn offset
    // is what makes the moon rise as the sun sets.
    expect(skyShader()).toContain("arcPosition(uCyclePhase+0.5)");
  });

  it("gates only the visuals behind the player setting", () => {
    const src = skyShader();
    expect(src).toContain("uShowSky");
    // The tide and wave uniforms must never be multiplied by the toggle,
    // otherwise hiding the sky would change how the game plays.
    expect(src).not.toMatch(/uTideHeight\s*\*\s*uShowSky/);
    expect(src).not.toMatch(/uWaveStrength\s*\*\s*uShowSky/);
  });
});

describe("win-time sun detonation", () => {
  beforeEach(() => clearSunBlast());

  it("is silent until a game ends", () => {
    expect(sunBlastAmount(1000)).toBe(0);
  });

  // This used to rise to full and fall back down the same curve, which the sky
  // could only read as the sun puffing up and quietly deflating -- never as an
  // explosion. It now runs one way through the whole sequence so the shader
  // can charge, detonate and throw a shockwave outward in that order.
  it("runs one way through charge, detonation and burnout", () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    triggerSunBlast();

    // Never exactly zero while running: zero is what "nothing is happening"
    // means, and the sky keys the sun's visibility off it.
    expect(sunBlastAmount(0)).toBeGreaterThan(0);
    expect(sunBlastAmount(0)).toBeLessThan(0.01);

    // Strictly forward, never doubling back.
    let previous = sunBlastAmount(0);
    for (const at of [400, 800, 1600, 2400, 3200, 4000]) {
      const now = sunBlastAmount(at);
      expect(now).toBeGreaterThan(previous);
      expect(now).toBeLessThanOrEqual(1);
      previous = now;
    }

    // It lets go when the charge ends.
    expect(sunBlastAmount(1600)).toBeCloseTo(SUN_BLAST_DETONATION, 5);

    // Finished, so the sky returns to its ordinary look.
    expect(sunBlastAmount(9000)).toBe(0);
    vi.restoreAllMocks();
  });
});

describe("keep playing after the sun exploded", () => {
  it("shows the exact message the owner asked for", () => {
    const overlay = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "resources/lang/en.openback.json"),
        "utf8",
      ),
    );
    expect(overlay.win_modal.sun_already_exploded).toBe(
      "The game is already done dont be weird even the sun exploded before you left",
    );
  });

  it("only appears once the player chose to stay", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/client/hud/layers/WinModal.ts"),
      "utf8",
    );
    expect(src).toContain("keptPlayingAfterBlast");
    expect(src).toContain("triggerSunBlast");
    // The banner itself is an OpenBack component, so upstream's win modal
    // carries a single tag rather than a block of our markup.
    expect(src).toContain("<openback-plaster-sun");
  });

  it("keeps the banner markup in an OpenBack file, not upstream's", () => {
    const banner = readFileSync(
      resolve(process.cwd(), "src/client/openback/PlasterSunBanner.ts"),
      "utf8",
    );
    expect(banner).toContain("openback-plaster-sun");
    expect(banner).toContain("win_modal.sun_already_exploded");
  });
});

// The sun and moon used to share one shallow arc that never left the visible
// sky, so both were up at once and the changeover was a cross-fade in place --
// the moon already overhead as the sun faded out. They now ride opposite sides
// of one circle and are shown according to their own altitude, so whichever is
// up has the sky to itself and dusk is one setting while the other climbs.
// Checked numerically over the cycle: each body is fully up for its own half
// and both are only faintly visible (0.22) at the two twilight crossings.
describe("day and night handover", () => {
  const source = readFileSync(
    "src/client/render/gl/passes/ThreeDCompositePass.ts",
    "utf8",
  );

  it("sends each body below the horizon for half the cycle", () => {
    // A full turn of the circle, not a half-sine that stays in frame.
    expect(source).toContain("float a=phase*6.28318530718");
    expect(source).toContain("SKY_HORIZON+cos(a)*SKY_ARC_HEIGHT");
    // The arc has to reach below the horizon or nothing ever sets.
    expect(source).toContain("const float SKY_HORIZON=0.40");
    expect(source).toContain("const float SKY_ARC_HEIGHT=0.50");
    expect(source).not.toContain("0.88-sin(t*3.14159265)*0.16");
  });

  it("fades each body by its own height rather than the daylight level", () => {
    expect(source).toContain("float sunVisible=max(aboveHorizonFade(sunPos.y)");
    expect(source).toContain("float moonVisible=aboveHorizonFade(moonPos.y)");
    // Threshold-on-daylight is what made the swap feel instant.
    expect(source).not.toContain("float sunVisible=max(day,uSunBlast)");
    expect(source).not.toContain("float moonVisible=night*uShowSky");
  });
});

// A game can be won at any hour. Once the sun and moon were given real arcs,
// the sun spends half the cycle below the horizon -- so a win at night swelled
// and detonated underneath the map, seen by nobody. It is drawn back into view
// as the blast takes hold: at night it climbs from y=-0.10 to 0.77 (the
// visible sky starts around 0.40), while at noon it barely moves.
describe("the win detonation", () => {
  const source = readFileSync(
    "src/client/render/gl/passes/ThreeDCompositePass.ts",
    "utf8",
  );

  it("lifts the sun into view for the blast", () => {
    expect(source).toContain("clamp(uSunBlast*1.6,0.0,1.0)");
    expect(source).toContain("SKY_HORIZON+SKY_ARC_HEIGHT*0.74");
  });

  it("still shows the sun regardless of its own altitude", () => {
    expect(source).toContain(
      "float sunVisible=max(aboveHorizonFade(sunPos.y),uSunBlast)",
    );
  });
});
