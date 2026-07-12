import { AttackExecution } from "../../../src/core/execution/AttackExecution";
import { ConstructionExecution } from "../../../src/core/execution/ConstructionExecution";
import { PlaneExecution } from "../../../src/core/execution/PlaneExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../../src/core/game/Game";
import { setup } from "../../util/Setup";
import { TestConfig } from "../../util/TestConfig";

class PlaneTestConfig extends TestConfig {
  planeFalloutRadius(): number {
    return 2;
  }
}

describe("PlaneExecution", () => {
  let game: Game;
  let attacker: Player;
  let defender: Player;
  const attackerInfo = new PlayerInfo("attacker", PlayerType.Human, null, "a");
  const defenderInfo = new PlayerInfo("defender", PlayerType.Human, null, "d");

  beforeEach(async () => {
    game = await setup(
      "plains",
      { infiniteGold: true, instantBuild: true, infiniteTroops: false },
      [attackerInfo, defenderInfo],
      undefined,
      PlaneTestConfig,
    );
    attacker = game.player(attackerInfo.id);
    defender = game.player(defenderInfo.id);
    attacker.conquer(game.ref(5, 5));
    // In-range target (~17 tiles from the runway, within the 20-tile test SAM
    // radius) and an out-of-range target (~106 tiles away).
    defender.conquer(game.ref(17, 17));
    defender.conquer(game.ref(29, 5));
    defender.conquer(game.ref(80, 80));
    attacker.addTroops(10_000);
    attacker.buildUnit(UnitType.Runway, game.ref(5, 5), {});
  });

  function loadPlane(troops: number) {
    game.addExecution(new PlaneExecution(attacker, game.ref(5, 5), troops));
    game.executeNextTick();
    const plane = attacker.units(UnitType.Plane)[0];
    for (let i = 0; i < 52; i++) game.executeNextTick();
    return plane;
  }

  test("loads exactly the requested troops and parks on the runway", () => {
    expect(
      attacker.buildableUnits(game.ref(5, 5), [UnitType.Plane])[0].canBuild,
    ).toBe(game.ref(5, 5));
    const troopsBefore = attacker.troops();
    const plane = loadPlane(1_234);
    expect(plane).toBeDefined();
    expect(plane.troops()).toBe(1_234);
    expect(attacker.troops()).toBe(troopsBefore - 1_234);
    expect(attacker.units(UnitType.Runway)).toHaveLength(1);
    expect(plane.isUnderConstruction()).toBe(false);
    expect(plane.isLoaded()).toBe(true);
    expect(plane.tile()).toBe(game.ref(5, 5));
  });

  test("refuses to launch beyond the runway's flight radius", () => {
    const troopsBefore = attacker.troops();
    const plane = loadPlane(1_234);
    game.addExecution(new PlaneExecution(attacker, game.ref(80, 80), 0));
    game.executeNextTick();
    expect(plane.isLoaded()).toBe(true);
    expect(attacker.troops()).toBe(troopsBefore - 1_234);
    expect(attacker.units(UnitType.Runway)).toHaveLength(1);
  });

  test("stacking a second runway doubles the launch radius", () => {
    const plane = loadPlane(1_234);
    game.addExecution(
      new ConstructionExecution(attacker, UnitType.Runway, game.ref(5, 5)),
    );
    game.executeNextTick();
    game.executeNextTick();
    expect(attacker.units(UnitType.Runway)).toHaveLength(1);
    expect(attacker.units(UnitType.Runway)[0].level()).toBe(2);
    game.addExecution(new PlaneExecution(attacker, game.ref(29, 5), 0));
    game.executeNextTick();
    expect(plane.isLoaded()).toBe(false);
    expect(plane.targetTile()).toBe(game.ref(29, 5));
  });

  test("a MANPAD destroys itself, the plane, and every carried troop", () => {
    const interceptTile = game.ref(11, 11);
    defender.buildUnit(UnitType.MANPAD, interceptTile, {});
    const plane = loadPlane(2_000);
    game.addExecution(new PlaneExecution(attacker, game.ref(17, 17), 0));
    game.executeNextTick();
    for (let i = 0; i < 2_000 && plane.isActive(); i++) {
      game.executeNextTick();
    }
    // The plane execution resolves the crash/fallout on the tick after the
    // interceptor's missile destroys the aircraft.
    game.executeNextTick();

    expect(plane.isActive()).toBe(false);
    expect(defender.units(UnitType.MANPAD)).toHaveLength(0);
    expect(game.hasFallout(plane.tile())).toBe(true);
  });

  test("flies multiple tiles per tick and captures the full crash area", () => {
    const plane = loadPlane(2_000);
    const start = plane.tile();
    const target = game.ref(17, 17);
    const nearbyNeutral = game.ref(18, 17);
    game.addExecution(new PlaneExecution(attacker, target, 0));

    let firstMovedTile = start;
    for (let i = 0; i < 120 && plane.isActive(); i++) {
      game.executeNextTick();
      if (plane.tile() !== start && firstMovedTile === start) {
        firstMovedTile = plane.tile();
      }
    }

    expect(game.manhattanDist(start, firstMovedTile)).toBeGreaterThanOrEqual(4);
    expect(plane.isActive()).toBe(false);
    expect(game.hasFallout(target)).toBe(true);
    expect(game.owner(target)).not.toBe(attacker);

    for (let i = 0; i < 19; i++) game.executeNextTick();
    expect(game.owner(target)).toBe(attacker);
    expect(game.owner(nearbyNeutral)).toBe(attacker);
    expect(attacker.hasLandAnnexationProtection()).toBe(true);

    for (let i = 0; i < 150; i++) game.executeNextTick();
    expect(attacker.hasLandAnnexationProtection()).toBe(false);
  });

  test("a surrounded crash beachhead cannot be automatically annexed", () => {
    // Fill the target region so the landing is completely enclosed by the
    // defender and would normally be removed by PlayerExecution annexation.
    for (let y = 12; y <= 22; y++) {
      for (let x = 12; x <= 22; x++) {
        defender.conquer(game.ref(x, y));
      }
    }
    const plane = loadPlane(2_000);
    const target = game.ref(17, 17);
    game.addExecution(new PlaneExecution(attacker, target, 0));
    for (let i = 0; i < 200 && plane.isActive(); i++) {
      game.executeNextTick();
    }
    for (let i = 0; i < 11; i++) game.executeNextTick();
    expect(game.owner(target)).toBe(attacker);

    // More than two annexation scans: the beachhead must remain until it is
    // actually fought over tile by tile.
    for (let i = 0; i < 60; i++) game.executeNextTick();
    expect(game.owner(target)).toBe(attacker);

    // The separate under-100-tiles attack finisher must not transfer the
    // player's remaining territory after taking a single beachhead tile.
    defender.addTroops(100_000);
    game.addExecution(
      new AttackExecution(100_000, defender, attacker.id(), game.ref(12, 17)),
    );
    game.executeNextTick();
    game.executeNextTick();
    expect(attacker.hasLandAnnexationProtection()).toBe(true);
    expect(game.owner(game.ref(5, 5))).toBe(attacker);
  });

  test("takeoff FX uses smoke, then fire and smoke, then stops", () => {
    const plane = loadPlane(2_000);
    game.addExecution(new PlaneExecution(attacker, game.ref(17, 17), 0));
    game.executeNextTick();
    expect(plane.launchPhase()).toBe(1);

    for (let i = 0; i < 51; i++) game.executeNextTick();
    expect(plane.launchPhase()).toBe(2);

    for (let i = 0; i < 51; i++) game.executeNextTick();
    expect(plane.launchPhase()).toBe(0);
  });
});
