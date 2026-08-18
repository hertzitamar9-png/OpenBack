import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSunBlast,
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

  it("swells to full, then fades back to nothing", () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    triggerSunBlast();
    expect(sunBlastAmount(0)).toBeCloseTo(0, 5);
    expect(sunBlastAmount(800)).toBeGreaterThan(0.4);
    expect(sunBlastAmount(1600)).toBeCloseTo(1, 2);
    // Decaying afterwards.
    expect(sunBlastAmount(2800)).toBeLessThan(1);
    expect(sunBlastAmount(2800)).toBeGreaterThan(0);
    // Fully finished, so the sky returns to normal daylight.
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
