import { describe, expect, it } from "vitest";
import { aimsAtADestination } from "../../../src/client/render/gl/passes/CrosshairPass";
import {
  UT_CITY,
  UT_MIRV,
  UT_PLANE,
  UT_PORT,
  UT_TANK,
  UT_WARSHIP,
} from "../../../src/client/render/types";

/**
 * Deploying a tank or an aircraft gave no cursor at all.
 *
 * Both are ordered to a destination exactly as a warship move or a MIRV strike
 * is, but the crosshair only switched on for those two -- so there was no way
 * to see where the vehicle would go, nor that it was about to be sent past the
 * range its base allows, which is what made a tank look like it died on the
 * way for no reason.
 */
describe("units that get a targeting crosshair", () => {
  it("includes the vehicles you aim at a destination", () => {
    expect(aimsAtADestination(UT_TANK)).toBe(true);
    expect(aimsAtADestination(UT_PLANE)).toBe(true);
  });

  it("keeps the ones that always had it", () => {
    expect(aimsAtADestination(UT_WARSHIP)).toBe(true);
    expect(aimsAtADestination(UT_MIRV)).toBe(true);
  });

  it("leaves buildings alone", () => {
    // A structure is placed where the cursor is; it is not aimed anywhere.
    expect(aimsAtADestination(UT_CITY)).toBe(false);
    expect(aimsAtADestination(UT_PORT)).toBe(false);
    expect(aimsAtADestination(undefined)).toBe(false);
  });
});
