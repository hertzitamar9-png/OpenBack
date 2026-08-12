import { describe, expect, it } from "vitest";
import { warTableHudClass } from "../../../src/client/hud/war-table/WarTableHud";

describe("Living War Table HUD", () => {
  it("exposes semantic surface and state classes", () => {
    expect(warTableHudClass("build", "affordable")).toContain(
      "ob-command--build",
    );
    expect(warTableHudClass("build", "affordable")).toContain(
      "ob-command--affordable",
    );
    expect(warTableHudClass("leaderboard", "local")).toContain(
      "ob-command--local",
    );
  });
});
