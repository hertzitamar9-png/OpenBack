import { describe, expect, it } from "vitest";
import {
  miniatureFor,
  WAR_TABLE_MOBILE_ORDER,
  WAR_TABLE_STRUCTURE_ORDER,
} from "../../../src/client/render/gl/war-table/WarTableMiniatureRegistry";
import {
  ALL_UNIT_TYPES,
  STRUCTURE_TYPES,
} from "../../../src/client/render/types";

describe("Living War Table miniature registry", () => {
  it("gives every canonical visible type a complete miniature contract", () => {
    for (const type of ALL_UNIT_TYPES) {
      const miniature = miniatureFor(type);
      expect(miniature.id, `${type} uses the fallback`).not.toBe("fallback");
      expect(miniature.atlasColumn).toBeGreaterThanOrEqual(0);
      expect(["none", "panel", "body", "trim"]).toContain(miniature.ownerMask);
      expect(miniature.scale).toBeGreaterThan(0);
      expect(Number.isFinite(miniature.groundOffset)).toBe(true);
      expect(miniature.family.length).toBeGreaterThan(0);
    }
  });

  it("keeps structure and mobile atlas orders exhaustive and separate", () => {
    expect(new Set(WAR_TABLE_STRUCTURE_ORDER)).toEqual(STRUCTURE_TYPES);
    expect(WAR_TABLE_MOBILE_ORDER).toEqual(
      ALL_UNIT_TYPES.filter((type) => !STRUCTURE_TYPES.has(type)),
    );
  });

  it("uses an explicit visible fallback for an unknown renderer type", () => {
    expect(miniatureFor("Unknown renderer type")).toMatchObject({
      id: "fallback",
      atlasColumn: 0,
      ownerMask: "body",
      scale: 1,
    });
  });
});
