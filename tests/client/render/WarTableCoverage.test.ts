import { describe, expect, it } from "vitest";
import {
  miniatureFor,
  WAR_TABLE_MOBILE_ORDER,
  WAR_TABLE_STRUCTURE_ORDER,
} from "../../../src/client/render/gl/war-table/WarTableMiniatureRegistry";
import { ALL_UNIT_TYPES } from "../../../src/client/render/types";

describe("Living War Table renderer coverage", () => {
  it("maps every canonical unit to a nonempty atlas cell", () => {
    expect(
      new Set([...WAR_TABLE_STRUCTURE_ORDER, ...WAR_TABLE_MOBILE_ORDER]),
    ).toEqual(new Set(ALL_UNIT_TYPES));
    for (const type of ALL_UNIT_TYPES) {
      const miniature = miniatureFor(type);
      expect(miniature.id).toBe(type);
      expect(miniature.atlasColumn).toBeGreaterThanOrEqual(0);
      expect(miniature.scale).toBeGreaterThan(0);
    }
  });
});
