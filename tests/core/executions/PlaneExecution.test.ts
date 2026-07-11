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
    );
    attacker = game.player(attackerInfo.id);
    defender = game.player(defenderInfo.id);
    attacker.conquer(game.ref(5, 5));
    // In-range target (~17 tiles from the runway, within the 20-tile test SAM
    // radius) and an out-of-range target (~106 tiles away).
    defender.conquer(game.ref(17, 17));
    defender.conquer(game.ref(35, 5));
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
    game.addExecution(new PlaneExecution(attacker, game.ref(35, 5), 0));
    game.executeNextTick();
    expect(plane.isLoaded()).toBe(false);
    expect(plane.targetTile()).toBe(game.ref(35, 5));
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
});
