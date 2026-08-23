import { ConstructionExecution } from "../../src/core/execution/ConstructionExecution";
import {
  bulkCost,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import { setup } from "../util/Setup";

describe("OpenBack added-unit pricing", () => {
  test.each([
    [UnitType.Runway, [250_000n, 500_000n, 750_000n]],
    [UnitType.Plane, [1_000_000n, 1_500_000n, 2_000_000n]],
    [UnitType.MANPAD, [300_000n, 600_000n, 1_000_000n]],
    [UnitType.MilitaryBase, [200_000n, 400_000n, 750_000n]],
    [UnitType.Tank, [500_000n, 750_000n, 1_000_000n]],
    [UnitType.TankMine, [250_000n, 350_000n, 500_000n]],
  ] as const)(
    "%s reaches its maximum price after two cheaper purchases",
    async (type, prices) => {
      const info = new PlayerInfo("player", PlayerType.Human, null, "player");
      const game = await setup(
        "plains",
        { startingGold: 100_000_000, instantBuild: true },
        [info],
      );
      const player = game.player(info.id);

      expect(game.unitInfo(type).cost(game, player)).toBe(prices[0]);
      const beforeFirst = player.gold();
      player.buildUnit(type, game.ref(5, 5), {});
      expect(beforeFirst - player.gold()).toBe(prices[0]);
      expect(game.unitInfo(type).cost(game, player)).toBe(prices[1]);
      const beforeSecond = player.gold();
      player.buildUnit(type, game.ref(6, 5), {});
      expect(beforeSecond - player.gold()).toBe(prices[1]);
      expect(game.unitInfo(type).cost(game, player)).toBe(prices[2]);
      const beforeThird = player.gold();
      player.buildUnit(type, game.ref(7, 5), {});
      expect(beforeThird - player.gold()).toBe(prices[2]);
      expect(game.unitInfo(type).cost(game, player)).toBe(prices[2]);
    },
  );

  test.each([
    [UnitType.Runway, [250_000n, 500_000n, 750_000n]],
    [UnitType.MANPAD, [300_000n, 600_000n, 1_000_000n]],
    [UnitType.MilitaryBase, [200_000n, 400_000n, 750_000n]],
    [UnitType.TankMine, [250_000n, 350_000n, 500_000n]],
  ] as const)(
    "stacking %s advances the displayed price tier",
    async (type, prices) => {
      const info = new PlayerInfo("player", PlayerType.Human, null, "player");
      const game = await setup(
        "plains",
        { startingGold: 100_000_000, instantBuild: true },
        [info],
      );
      const player = game.player(info.id);
      const structure = player.buildUnit(type, game.ref(5, 5), {});

      expect(game.unitInfo(type).cost(game, player)).toBe(prices[1]);
      const beforeStack = player.gold();
      player.upgradeUnit(structure);
      expect(beforeStack - player.gold()).toBe(prices[1]);
      expect(game.unitInfo(type).cost(game, player)).toBe(prices[2]);
    },
  );

  test.each([
    UnitType.Runway,
    UnitType.MANPAD,
    UnitType.MilitaryBase,
    UnitType.TankMine,
  ] as const)(
    "bulk-stacks five %s levels through the build intent path",
    async (type) => {
      const info = new PlayerInfo("player", PlayerType.Human, null, "player");
      const game = await setup(
        "plains",
        { startingGold: 100_000_000, instantBuild: true },
        [info],
      );
      const player = game.player(info.id);
      const tile = game.ref(5, 5);
      player.conquer(tile);
      const structure = player.buildUnit(type, tile, {});
      const before = player.gold();
      let expected = 0n;
      for (let i = 0; i < 5; i++) {
        expected += game.unitInfo(type).cost(game, player, i);
      }
      const buildable = player.buildableUnits(tile, [type])[0];
      expect(buildable.upgradeCosts?.length).toBeGreaterThanOrEqual(5);
      expect(bulkCost(buildable, 5)).toBe(expected);

      game.addExecution(
        new ConstructionExecution(player, type, tile, undefined, 5),
      );
      game.executeNextTick();
      game.executeNextTick();

      expect(structure.level()).toBe(6);
      expect(before - player.gold()).toBe(expected);
    },
  );
});
