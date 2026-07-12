import { MilitaryBaseExecution } from "../../../src/core/execution/MilitaryBaseExecution";
import { RunwayExecution } from "../../../src/core/execution/RunwayExecution";
import {
  Game,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../../src/core/game/Game";
import { setup } from "../../util/Setup";

describe("military fuel railroad", () => {
  test("connects a base to a runway, runs a real train, and pays half train income", async () => {
    const info = new PlayerInfo("fuel", PlayerType.Human, null, "fuel");
    const game: Game = await setup(
      "plains",
      { infiniteGold: true, instantBuild: true },
      [info],
    );
    const player = game.player(info.id);
    for (let x = 10; x <= 35; x++) player.conquer(game.ref(x, 20));

    const base = player.buildUnit(UnitType.MilitaryBase, game.ref(10, 20), {});
    const runway = player.buildUnit(UnitType.Runway, game.ref(35, 20), {});
    game.addExecution(new MilitaryBaseExecution(base));
    game.addExecution(new RunwayExecution(runway));

    let sawFuelTrain = false;
    const goldBefore = player.gold();
    for (let i = 0; i < 450; i++) {
      game.executeNextTick();
      sawFuelTrain ||= player.units(UnitType.Train).some((u) => u.isActive());
    }

    expect(base.hasTrainStation()).toBe(true);
    expect(runway.hasTrainStation()).toBe(true);
    expect(sawFuelTrain).toBe(true);
    expect(player.gold()).toBeGreaterThan(goldBefore);
  });
});
