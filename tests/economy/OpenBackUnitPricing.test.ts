import { PlayerInfo, PlayerType, UnitType } from "../../src/core/game/Game";
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
});
