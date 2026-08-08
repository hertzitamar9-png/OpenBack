import { describe, expect, it } from "vitest";
import { renderDprForProfile } from "../../../../src/client/render/gl/utils/Dpr";

describe("renderDprForProfile", () => {
  it("limits low-end phones to a light backing buffer", () => {
    expect(
      renderDprForProfile({
        devicePixelRatio: 3,
        viewportWidth: 390,
        hardwareConcurrency: 4,
        deviceMemory: 4,
        coarsePointer: true,
      }),
    ).toBe(1.25);
  });

  it("keeps sharper rendering on capable phones", () => {
    expect(
      renderDprForProfile({
        devicePixelRatio: 3,
        viewportWidth: 430,
        hardwareConcurrency: 8,
        deviceMemory: 8,
        coarsePointer: true,
      }),
    ).toBe(1.5);
  });

  it("preserves the existing desktop cap", () => {
    expect(
      renderDprForProfile({
        devicePixelRatio: 3,
        viewportWidth: 1920,
        hardwareConcurrency: 16,
        deviceMemory: 16,
        coarsePointer: false,
      }),
    ).toBe(2);
  });
});
