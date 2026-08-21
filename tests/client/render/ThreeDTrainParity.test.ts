import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldCullWorldText } from "../../../src/client/render/gl/passes/WorldTextPass";
import { trainVisualSpacing } from "../../../src/core/execution/TrainExecution";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("3D train parity", () => {
  it("keeps the 2D consist spacing and separates cars in 3D", () => {
    expect(trainVisualSpacing("2d")).toBe(2);
    expect(trainVisualSpacing("3d")).toBeGreaterThan(2);
  });

  it("keeps screen-facing train payout text visible below the 2D cull zoom", () => {
    expect(shouldCullWorldText(0.2, 0.3, false)).toBe(true);
    expect(shouldCullWorldText(0.2, 0.3, true)).toBe(false);
  });

  it("composites recognizable layered rails onto raised 3D terrain", () => {
    const composite = source(
      "src/client/render/gl/passes/ThreeDCompositePass.ts",
    );
    const renderer = source("src/client/render/gl/Renderer.ts");
    expect(composite).toContain("uRailroadState");
    expect(composite).toContain("railSurfaceLayers");
    expect(composite).toContain("float gauge=0.105");
    expect(composite).toContain("abs(d-gauge)");
    expect(composite).toContain("clamp(fwidth(d)*1.35,0.006,0.028)");
    expect(composite).toContain("vec3 railBallast");
    expect(composite).toContain("vec3 sleeperWood");
    expect(composite).toContain("vec3 railSteel");
    expect(renderer).toContain("this.railroadPass.prepareTextures()");
    expect(renderer).toContain("this.railroadPass.railroadTexture()");
  });

  it("shows and enforces the 3D mountain landing reason in the build preview", () => {
    const controller = source(
      "src/client/controllers/BuildPreviewController.ts",
    );
    expect(controller).toContain("isAircraftLandingTooHigh");
    expect(controller).toContain("events_display.aircraft_land_too_high");
    expect(controller).toContain('new CustomEvent("show-message"');
  });
});
