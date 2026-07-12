import { PlayerInfo, PlayerType, UnitType } from "../../src/core/game/Game";
import { setup } from "../util/Setup";

describe("OpenBack added-unit pricing", () => {
  test.each([
    [UnitType.Runway, [250_000n, 500_000n, 750_000n]],
    [UnitType.Plane, [1_000_000n, 1_500_000n, 2_000_000n]],
    [UnitType.MANPAD, [300_000n, 600_000n, 1_000_000n]],
    [UnitType.MilitaryBase, [200_000n, 400_000n, 750_000n]],
    [UnitType.Tank, [500_000n, 750_000n, 1_000_000n]],
    [UnitType.TankMine, [100_000n, 200_000n, 400_000n]],
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
      player.buildUnit(type, game.ref(5, 5), {});
      expect(game.unitInfo(type).cost(game, player)).toBe(prices[1]);
      player.buildUnit(type, game.ref(6, 5), {});
      expect(game.unitInfo(type).cost(game, player)).toBe(prices[2]);
      player.buildUnit(type, game.ref(7, 5), {});
      expect(game.unitInfo(type).cost(game, player)).toBe(prices[2]);
    },
  );
});
