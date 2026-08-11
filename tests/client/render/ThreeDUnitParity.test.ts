import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  collectThreeDRenderableUnits,
  threeDGhostPresentation,
  threeDModelBatchKey,
} from "../../../src/client/render/gl/three-d/ThreeDUnitPass";
import type {
  GhostPreviewData,
  UnitState,
} from "../../../src/client/render/types/Renderer";
import { UnitType } from "../../../src/core/game/Game";

function unit(id: number, unitType: UnitType): UnitState {
  return {
    id,
    unitType,
    pos: id,
    lastPos: id,
    ownerID: 1,
    isActive: true,
    visibleToLocal: true,
    underConstruction: false,
  } as UnitState;
}

describe("3D unit parity", () => {
  it("keeps names, levels, and world text screen-facing in the 3D overlay pass", () => {
    const renderer = readFileSync(
      resolve(process.cwd(), "src/client/render/gl/Renderer.ts"),
      "utf8",
    );

    expect(renderer).toContain("threeDScreenFacingScale(threeDCamera)");
    expect(renderer).toMatch(
      /this\.renderOverlays\([\s\S]*?billboardCamera,[\s\S]*?screenFacingScale,[\s\S]*?\);/,
    );
  });

  it("routes every unit through the real asset batch", () => {
    for (const type of Object.values(UnitType)) {
      expect(threeDModelBatchKey(type)).toBe(`asset:${type}`);
    }
  });

  it("renders structures and mobile units in the same 3D scene", () => {
    const mobile = new Map([[1, unit(1, UnitType.Tank)]]);
    const structures = new Map([[2, unit(2, UnitType.MilitaryBase)]]);

    expect([...collectThreeDRenderableUnits(mobile, structures)]).toEqual([
      mobile.get(1),
      structures.get(2),
    ]);
  });

  it("uses a white valid ghost and gray invalid ghost at the authoritative preview tile", () => {
    const preview = {
      ghostType: UnitType.Runway,
      tileX: 31,
      tileY: 42,
      radiusTileX: 31,
      radiusTileY: 42,
      canBuild: true,
      canUpgrade: false,
      ownerID: 7,
    } as GhostPreviewData;

    expect(threeDGhostPresentation(preview)).toMatchObject({
      unitType: UnitType.Runway,
      x: 31,
      z: 42,
      valid: true,
    });
    expect(
      threeDGhostPresentation({ ...preview, canBuild: false }),
    ).toMatchObject({ valid: false });
  });
});
