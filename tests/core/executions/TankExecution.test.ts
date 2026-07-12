import { TankExecution } from "../../../src/core/execution/TankExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../../src/core/game/Game";
import { setup } from "../../util/Setup";

describe("TankExecution", () => {
  let game: Game;
  let attacker: Player;
  let defender: Player;
  const attackerInfo = new PlayerInfo("attacker", PlayerType.Human, null, "a");
  const defenderInfo = new PlayerInfo("defender", PlayerType.Human, null, "d");

  beforeEach(async () => {
    game = await setup(
      "plains",
      { instantBuild: true, startingGold: 5_000_000 },
      [attackerInfo, defenderInfo],
    );
    attacker = game.player(attackerInfo.id);
    defender = game.player(defenderInfo.id);
    attacker.conquer(game.ref(5, 5));
    defender.conquer(game.ref(18, 5));
    attacker.buildUnit(UnitType.MilitaryBase, game.ref(5, 5), {});
  });

  test("charges once, launches from its base, and leaves a wide fallout trail", () => {
    expect(
      attacker.buildableUnits(game.ref(5, 5), [UnitType.Tank])[0].canBuild,
    ).toBe(game.ref(5, 5));
    const before = attacker.gold();
    game.addExecution(new TankExecution(attacker, game.ref(5, 5)));
    game.executeNextTick();
    expect(before - attacker.gold()).toBe(500_000n);

    const tank = attacker.units(UnitType.Tank)[0];
    expect(tank.isLoaded()).toBe(true);
    game.addExecution(new TankExecution(attacker, game.ref(18, 5)));
    const destructionPhases = new Set<number>();
    for (let i = 0; i < 100 && tank.isActive(); i++) {
      game.executeNextTick();
      destructionPhases.add(tank.launchPhase());
    }

    const trailTile = game.ref(10, 7);
    expect(game.hasFallout(trailTile)).toBe(true);
    expect(game.hasFallout(game.ref(10, 11))).toBe(true);
    expect(game.hasFallout(game.ref(18, 9))).toBe(true);
    expect(game.hasOwner(trailTile)).toBe(false);
    expect(tank.isActive()).toBe(false);
    expect([...destructionPhases]).toEqual(
      expect.arrayContaining([20, 30, 40]),
    );
  });

  test("moves 50% faster than a transport and keeps aimed at its target", () => {
    game.addExecution(new TankExecution(attacker, game.ref(5, 5)));
    game.executeNextTick();
    const tank = attacker.units(UnitType.Tank)[0];
    const start = tank.tile();

    game.addExecution(new TankExecution(attacker, game.ref(18, 5)));
    game.executeNextTick();
    expect(tank.tile()).toBe(start);
    game.executeNextTick();
    expect(tank.tile()).not.toBe(start);
    game.executeNextTick();
    expect(game.manhattanDist(start, tank.tile())).toBe(3);
    expect(Number.isFinite(tank.trajectoryAngle())).toBe(true);
  });

  test("snaps tank placement using the legacy structure distance", () => {
    const nearby = game.ref(17, 5);
    attacker.conquer(nearby);
    expect(attacker.buildableUnits(nearby, [UnitType.Tank])[0].canBuild).toBe(
      game.ref(5, 5),
    );
  });
});
