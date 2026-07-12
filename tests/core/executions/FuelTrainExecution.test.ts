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
    for (let x = 10; x <= 30; x++) player.conquer(game.ref(x, 20));

    const base = player.buildUnit(UnitType.MilitaryBase, game.ref(10, 20), {});
    // TestConfig's level-one shared operational radius is exactly 20 tiles.
    const runway = player.buildUnit(UnitType.Runway, game.ref(30, 20), {});
    game.addExecution(new MilitaryBaseExecution(base));
    game.addExecution(new RunwayExecution(runway));

    let sawFuelTrain = false;
    let maxTrainUnits = 0;
    const goldBefore = player.gold();
    for (let i = 0; i < 450; i++) {
      game.executeNextTick();
      const activeTrainUnits = player
        .units(UnitType.Train)
        .filter((u) => u.isActive()).length;
      sawFuelTrain ||= activeTrainUnits > 0;
      maxTrainUnits = Math.max(maxTrainUnits, activeTrainUnits);
    }

    expect(base.hasTrainStation()).toBe(true);
    expect(runway.hasTrainStation()).toBe(true);
    expect(sawFuelTrain).toBe(true);
    // Engine + tail engine + five cars, identical to standard trains.
    expect(maxTrainUnits).toBe(7);
    expect(player.gold()).toBeGreaterThan(goldBefore);
  });

  test("uses the exact shared operational radius at the boundary", async () => {
    const info = new PlayerInfo("range", PlayerType.Human, null, "range");
    const game: Game = await setup(
      "plains",
      { infiniteGold: true, instantBuild: true },
      [info],
    );
    const player = game.player(info.id);
    const baseTile = game.ref(10, 20);
    const exactRange = game.config().fuelRailMaxRange(1, 1);
    expect(exactRange).toBe(
      Math.min(
        game.config().tankMaxDriveRadius(1),
        game.config().planeMaxFlightRadius(1),
      ),
    );

    for (let x = 10; x <= 10 + exactRange + 1; x++) {
      player.conquer(game.ref(x, 20));
    }
    const base = player.buildUnit(UnitType.MilitaryBase, baseTile, {});
    const tooFarRunway = player.buildUnit(
      UnitType.Runway,
      game.ref(10 + exactRange + 1, 20),
      {},
    );
    game.addExecution(new MilitaryBaseExecution(base));
    game.addExecution(new RunwayExecution(tooFarRunway));
    for (let i = 0; i < 50; i++) game.executeNextTick();
    expect(base.hasTrainStation()).toBe(false);
    expect(tooFarRunway.hasTrainStation()).toBe(false);

    const boundaryRunway = player.buildUnit(
      UnitType.Runway,
      game.ref(10 + exactRange, 20),
      {},
    );
    game.addExecution(new RunwayExecution(boundaryRunway));
    for (let i = 0; i < 50; i++) game.executeNextTick();
    expect(base.hasTrainStation()).toBe(true);
    expect(boundaryRunway.hasTrainStation()).toBe(true);
  });
});
