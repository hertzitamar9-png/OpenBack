import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { executeRecoverableFrame } from "../../../src/client/render/gl/utils/FrameRecovery";
import {
  clampWorldRadius,
  isFiniteClipGeometry,
} from "../../../src/client/render/gl/utils/ProjectionSafety";
import {
  NUKE_MAGNITUDES,
  UT_ATOM_BOMB,
  UT_HYDROGEN_BOMB,
  UT_MIRV_WARHEAD,
} from "../../../src/client/render/types/UnitType";

describe("projection safety", () => {
  it("rejects non-finite projected geometry", () => {
    expect(isFiniteClipGeometry([0, 1, -1, 0.5])).toBe(true);
    expect(isFiniteClipGeometry([0, Number.NaN, 1])).toBe(false);
    expect(isFiniteClipGeometry([0, Number.POSITIVE_INFINITY, 1])).toBe(false);
  });

  it("keeps valid world radii and rejects invalid or map-covering inputs", () => {
    expect(clampWorldRadius(100, 1024, 512)).toBe(100);
    expect(clampWorldRadius(Number.NaN, 1024, 512)).toBe(0);
    expect(clampWorldRadius(-4, 1024, 512)).toBe(0);
    expect(clampWorldRadius(10_000, 100, 80)).toBeCloseTo(Math.hypot(100, 80));
  });

  it("does not alter authoritative bomb damage magnitudes", () => {
    expect(NUKE_MAGNITUDES[UT_MIRV_WARHEAD]).toEqual({ inner: 12, outer: 18 });
    expect(NUKE_MAGNITUDES[UT_ATOM_BOMB]).toEqual({ inner: 12, outer: 30 });
    expect(NUKE_MAGNITUDES[UT_HYDROGEN_BOMB]).toEqual({
      inner: 80,
      outer: 100,
    });
  });
});

describe("recoverable render frames", () => {
  it("wires railroads to the shared terrain texture instead of CPU bytes", () => {
    const renderer = readFileSync("src/client/render/gl/Renderer.ts", "utf8");
    const railroadConstruction = renderer.match(
      /this\.railroadPass = new RailroadPass\([\s\S]*?this\.settings,\s*\);/,
    )?.[0];

    expect(railroadConstruction).toContain("this.terrainBytesTex!");
    expect(railroadConstruction).not.toContain("terrainBytes,");
    expect(renderer).not.toContain("this.railroadPass.applyTerrainDelta");
  });

  it("schedules the next frame even when drawing throws", () => {
    const report = vi.fn();
    const schedule = vi.fn();
    executeRecoverableFrame(
      () => {
        throw new Error("optional pass failed");
      },
      report,
      schedule,
    );
    expect(report).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledOnce();
  });

  it("abandons a lost context without deliberately losing it again", () => {
    const facade = readFileSync("src/client/render/gl/MapRenderer.ts", "utf8");
    expect(facade).toContain("this.renderer.abandonLostContext()");
    expect(facade).not.toMatch(
      /handleContextLost[\\s\\S]*?this\.renderer\.dispose\(\)/,
    );
  });

  it("survives a long synthetic match with repeated effect failures", () => {
    let scheduled = 0;
    let reported = 0;
    for (let frame = 0; frame < 50_000; frame++) {
      const radius = frame % 19 === 0 ? Number.POSITIVE_INFINITY : frame % 250;
      expect(clampWorldRadius(radius, 2048, 1024)).toBeLessThanOrEqual(
        Math.hypot(2048, 1024),
      );
      executeRecoverableFrame(
        () => {
          if (frame % 997 === 0) throw new Error("effect pass failed");
        },
        () => reported++,
        () => scheduled++,
      );
    }
    expect(scheduled).toBe(50_000);
    expect(reported).toBe(51);
  });
});

describe("nuke warning readability", () => {
  it("does not render the real blast radius as a map-covering 2D warning", () => {
    const shader = readFileSync(
      "src/client/render/gl/shaders/nuke-telegraph/nuke-telegraph.frag.glsl",
      "utf8",
    );
    expect(shader).toContain("float routeFill = step(0.5, vRouteKind)");
    expect(shader).toContain("float fillAlpha = routeFill * innerFill");
    expect(shader).toContain("float strokeAlpha = routeFill * innerStroke");
    expect(shader).toContain("float outerAlpha = routeFill * outerRing");
  });

  it("keeps a fixed-screen-size final-destination reticle visible for nukes", () => {
    const shader = readFileSync(
      "src/client/render/gl/shaders/nuke-telegraph/nuke-telegraph.frag.glsl",
      "utf8",
    );
    expect(shader).toContain("uniform float uWorldUnitsPerPixel");
    expect(shader).toContain("float targetReticleDistPx");
    expect(shader).toContain("float targetReticleAlpha");
    expect(shader).toContain("vec3 targetReticleColor = vec3(0.16, 1.0, 0.3)");
  });

  it("uses the compact cursor for Atom and Hydrogen Bomb placement", () => {
    const preview = readFileSync(
      "src/client/controllers/BuildPreviewController.ts",
      "utf8",
    );
    const crosshair = readFileSync(
      "src/client/render/gl/passes/CrosshairPass.ts",
      "utf8",
    );
    expect(preview).not.toContain(
      "rangeRadius = this.game.config().nukeMagnitudes(u.type).outer",
    );
    expect(crosshair).toContain("UT_ATOM_BOMB");
    expect(crosshair).toContain("UT_HYDROGEN_BOMB");
    expect(crosshair).toContain("nukeTargetCursor");
  });
});
