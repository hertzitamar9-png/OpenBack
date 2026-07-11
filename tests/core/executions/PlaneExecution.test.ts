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
    defender.conquer(game.ref(80, 80));
    attacker.addTroops(10_000);
    attacker.buildUnit(UnitType.Runway, game.ref(5, 5), {});
  });

  test("loads exactly the requested troops and consumes the runway", () => {
    const troopsBefore = attacker.troops();
    game.addExecution(new PlaneExecution(attacker, game.ref(17, 17), 1_234));

    game.executeNextTick();
    const plane = attacker.units(UnitType.Plane)[0];
    expect(plane).toBeDefined();
    expect(plane.troops()).toBe(1_234);
    expect(attacker.troops()).toBe(troopsBefore - 1_234);
    expect(attacker.units(UnitType.Runway)).toHaveLength(1);

    for (let i = 0; i < 102; i++) game.executeNextTick();
    expect(attacker.units(UnitType.Runway)).toHaveLength(0);
    expect(plane.isUnderConstruction()).toBe(false);
  });

  test("refuses to launch beyond the runway's flight radius", () => {
    const troopsBefore = attacker.troops();
    game.addExecution(new PlaneExecution(attacker, game.ref(80, 80), 1_234));

    game.executeNextTick();
    expect(attacker.units(UnitType.Plane)).toHaveLength(0);
    // No troops committed and the runway is left intact.
    expect(attacker.troops()).toBe(troopsBefore);
    expect(attacker.units(UnitType.Runway)).toHaveLength(1);
  });

  test("a MANPAD destroys itself, the plane, and every carried troop", () => {
    const interceptTile = game.ref(11, 11);
    defender.buildUnit(UnitType.MANPAD, interceptTile, {});
    game.addExecution(new PlaneExecution(attacker, game.ref(17, 17), 2_000));

    game.executeNextTick();
    const plane = attacker.units(UnitType.Plane)[0];
    for (let i = 0; i < 2_000 && plane.isActive(); i++) {
      game.executeNextTick();
    }

    expect(plane.isActive()).toBe(false);
    expect(defender.units(UnitType.MANPAD)).toHaveLength(0);
    expect(game.hasFallout(plane.tile())).toBe(true);
  });
});
