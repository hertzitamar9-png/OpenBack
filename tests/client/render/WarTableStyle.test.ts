import { describe, expect, it } from "vitest";
import {
  warTableLod,
  warTableMotion,
} from "../../../src/client/render/gl/war-table/WarTableStyle";

describe("Living War Table style", () => {
  it("keeps distant pieces recognizable while adding detail at stable zoom bands", () => {
    expect(warTableLod(0.25)).toEqual({
      detail: "silhouette",
      detailScale: 0,
    });
    expect(warTableLod(0.75)).toEqual({
      detail: "material",
      detailScale: 0.55,
    });
    expect(warTableLod(1.5)).toEqual({
      detail: "mechanical",
      detailScale: 1,
    });
  });

  it("removes decorative motion without weakening tactical warnings", () => {
    expect(warTableMotion(true)).toEqual({
      decorativeScale: 0,
      warningScale: 1,
    });
    expect(warTableMotion(false)).toEqual({
      decorativeScale: 1,
      warningScale: 1,
    });
  });
});
