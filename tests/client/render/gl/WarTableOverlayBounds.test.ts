import { describe, expect, it } from "vitest";
import {
  clampWarTableLabelSize,
  WAR_TABLE_OVERLAY,
} from "../../../../src/client/render/gl/war-table/WarTableStyle";

describe("Living War Table overlay bounds", () => {
  it("keeps tactical presentation tokens finite and restrained", () => {
    for (const value of Object.values(WAR_TABLE_OVERLAY)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
    expect(WAR_TABLE_OVERLAY.pathWidth).toBeLessThanOrEqual(2);
    expect(WAR_TABLE_OVERLAY.targetAlpha).toBeLessThan(1);
  });

  it("caps labels at overview and close zoom", () => {
    expect(clampWarTableLabelSize(2, 0.05)).toBeGreaterThanOrEqual(8);
    expect(clampWarTableLabelSize(100, 8)).toBeLessThanOrEqual(30);
  });
});
