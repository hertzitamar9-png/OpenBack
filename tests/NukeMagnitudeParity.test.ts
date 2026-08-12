import { describe, expect, it } from "vitest";
import { NUKE_EXPLOSION_RADII } from "../src/client/render/gl/passes/fx-pass/FxSpritePass";
import {
  UT_ATOM_BOMB,
  UT_HYDROGEN_BOMB,
  UT_MIRV_WARHEAD,
} from "../src/client/render/types";
import { Config } from "../src/core/configuration/Config";
import { UnitType } from "../src/core/game/Game";

describe("OpenFront nuke magnitude parity", () => {
  const config = Object.create(Config.prototype) as Config;

  it("keeps authoritative gameplay damage radii unchanged", () => {
    expect(config.nukeMagnitudes(UnitType.AtomBomb)).toEqual({
      inner: 12,
      outer: 30,
    });
    expect(config.nukeMagnitudes(UnitType.HydrogenBomb)).toEqual({
      inner: 80,
      outer: 100,
    });
    expect(config.nukeMagnitudes(UnitType.MIRVWarhead)).toEqual({
      inner: 12,
      outer: 18,
    });
  });

  it("caps explosion artwork at each weapon's dashed outer radius", () => {
    expect(NUKE_EXPLOSION_RADII[UT_ATOM_BOMB]).toBe(30);
    expect(NUKE_EXPLOSION_RADII[UT_HYDROGEN_BOMB]).toBe(100);
    expect(NUKE_EXPLOSION_RADII[UT_MIRV_WARHEAD]).toBe(18);
  });
});
