import { describe, expect, it } from "vitest";
import {
  fitNameScaleToTerritory,
  renderedNamePlateWidth,
} from "../../../src/client/render/gl/passes/name-pass/NameScale";

const metrics = {
  fontSize: 64,
  fontBase: 48,
  nameScaleFactor: 0.4,
  nameScaleCap: 3,
};

describe("country name containment", () => {
  it("shrinks an oversized plate until it fits its own territory", () => {
    const fitted = fitNameScaleToTerritory({
      requestedSize: 34,
      availableWidth: 110,
      nameHalfWidth: 105,
      hasFlag: true,
      verified: false,
      ...metrics,
    });

    expect(fitted).toBeLessThan(34);
    expect(
      renderedNamePlateWidth({
        baseSize: fitted,
        nameHalfWidth: 105,
        hasFlag: true,
        verified: false,
        ...metrics,
      }),
    ).toBeLessThanOrEqual(110 * 0.92);
  });

  it("keeps a large label unchanged when its full plate fits", () => {
    expect(
      fitNameScaleToTerritory({
        requestedSize: 24,
        availableWidth: 400,
        nameHalfWidth: 75,
        hasFlag: true,
        verified: true,
        ...metrics,
      }),
    ).toBe(24);
  });

  it("reserves width for flags and verified badges", () => {
    const textOnly = renderedNamePlateWidth({
      baseSize: 20,
      nameHalfWidth: 70,
      hasFlag: false,
      verified: false,
      ...metrics,
    });
    const completePlate = renderedNamePlateWidth({
      baseSize: 20,
      nameHalfWidth: 70,
      hasFlag: true,
      verified: true,
      ...metrics,
    });

    expect(completePlate).toBeGreaterThan(textOnly);
  });
});
