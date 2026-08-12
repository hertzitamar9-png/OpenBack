import { describe, expect, it } from "vitest";
import {
  classifyWarTableTerrain,
  warTableTerrainDetail,
} from "../../../src/client/render/gl/war-table/WarTableTerrain";

describe("Living War Table terrain", () => {
  it("classifies encoded terrain without ownership data", () => {
    expect(classifyWarTableTerrain(0)).toMatchObject({ kind: "water" });
    expect(classifyWarTableTerrain(0x40 | 3)).toMatchObject({
      kind: "shore-water",
    });
    expect(classifyWarTableTerrain(0x80 | 0x40 | 2)).toMatchObject({
      kind: "sand",
    });
    expect(classifyWarTableTerrain(0x80 | 6)).toMatchObject({ kind: "plains" });
    expect(classifyWarTableTerrain(0x80 | 15)).toMatchObject({
      kind: "highland",
    });
    expect(classifyWarTableTerrain(0x80 | 24)).toMatchObject({
      kind: "mountain",
    });
    expect(classifyWarTableTerrain(0x80 | 31)).toMatchObject({ kind: "peak" });
  });

  it("keeps distant material quiet and close material bounded", () => {
    expect(warTableTerrainDetail(0.25)).toBe(0);
    expect(warTableTerrainDetail(0.75)).toBeCloseTo(0.5);
    expect(warTableTerrainDetail(1.5)).toBe(1);
  });
});
