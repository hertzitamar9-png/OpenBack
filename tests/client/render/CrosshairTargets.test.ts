import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

/**
 * The vehicle cursor is drawn white where the spot will take the vehicle and
 * grey where it will not -- not the red a warship or a MIRV gets, because
 * sending a tank somewhere is a move rather than a strike.
 *
 * This was written once and then lost: no ordinary commit removed it, it
 * disappeared inside an upstream merge, which left the cursor drawing in
 * warship red with no signal for whether the tile was in reach. Nothing
 * guarded it, so nothing complained. These assertions are that guard.
 */
describe("the tank and aircraft cursor colours", () => {
  const src = readFileSync(
    resolve(process.cwd(), "src/client/render/gl/passes/CrosshairPass.ts"),
    "utf8",
  );

  it("tells a vehicle deployment apart from a strike", () => {
    expect(src).toContain("private neutralVehicleCursor = false;");
    expect(src).toContain(
      "data.ghostType === UT_PLANE || data.ghostType === UT_TANK",
    );
  });

  it("goes white on a tile that takes it and grey on one that does not", () => {
    expect(src).toContain(
      "if (this.neutralVehicleCursor && this.canBuild) {\n" +
        "      gl.uniform3f(this.uColor, 1.0, 1.0, 1.0);",
    );
    expect(src).toContain(
      "} else if (this.neutralVehicleCursor) {\n" +
        "      gl.uniform3f(this.uColor, 0.62, 0.62, 0.62);",
    );
  });

  it("still reddens a warship or MIRV target", () => {
    // The neutral branches must come first but must not swallow the strike
    // colours -- those are what a MIRV has always shown.
    expect(src).toContain("gl.uniform3f(this.uColor, 0.9, 0.15, 0.15);");
    expect(src).toContain("gl.uniform3f(this.uColor, 0.4, 0.1, 0.1);");
  });

  it("draws the cursor at the size the vehicle cursor uses", () => {
    // Dropped to 20 by the same merge; the aiming cursor is drawn at 24.
    expect(src).toContain("const CROSSHAIR_PX = 24;");
  });
});
