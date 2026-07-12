import { Execution, Game, Player, Unit, UnitType } from "../game/Game";
import { TrainExecution } from "./TrainExecution";
import { TrainStationExecution } from "./TrainStationExecution";

/** Periodic fuel convoy income between a base and nearby completed runways. */
export class MilitaryBaseExecution implements Execution {
  private active = true;
  private game: Game;
  private stationsCreated = false;

  constructor(private base: Unit) {}

  init(game: Game): void {
    this.game = game;
  }

  tick(ticks: number): void {
    if (!this.base.isActive()) {
      this.active = false;
      return;
    }
    if (!this.stationsCreated) {
      this.createFuelStations();
      this.stationsCreated = true;
    }
    // A convoy cadence is deliberately slower than normal passive income.
    if (ticks % 200 !== this.base.id() % 200) return;
    this.createFuelStations();
    const links = this.game.nearbyUnits(
      this.base.tile(),
      this.game.config().tankMaxDriveRadius(this.base.level()),
      [UnitType.Runway],
    );
    for (const { unit: runway } of links) {
      if (!runway.isActive() || runway.isUnderConstruction()) continue;
      const range = this.game
        .config()
        .fuelRailMaxRange(this.base.level(), runway.level());
      if (
        this.game.euclideanDistSquared(this.base.tile(), runway.tile()) >
        range * range
      ) {
        continue;
      }
      const source = this.game
        .railNetwork()
        .stationManager()
        .findStation(this.base);
      const destination = this.game
        .railNetwork()
        .stationManager()
        .findStation(runway);
      if (!source || !destination) continue;
      if (
        this.base
          .owner()
          .units(UnitType.Train)
          .some((train) => train.isActive() && train.targetUnit() === runway)
      ) {
        continue;
      }
      this.game.addExecution(
        new TrainExecution(
          this.game.railNetwork(),
          this.base.owner(),
          source,
          destination,
          // Match ordinary city/factory trains: tail engine + five carriages.
          5,
        ),
      );
    }
  }

  private createFuelStations(): void {
    const runways = this.game
      .nearbyUnits(
        this.base.tile(),
        this.game.config().tankMaxDriveRadius(this.base.level()),
        [UnitType.Runway],
      )
      .filter(({ unit }) => {
        if (unit.isUnderConstruction()) return false;
        const range = this.game
          .config()
          .fuelRailMaxRange(this.base.level(), unit.level());
        return (
          this.game.euclideanDistSquared(this.base.tile(), unit.tile()) <=
          range * range
        );
      });
    if (runways.length === 0) return;
    if (!this.base.hasTrainStation()) {
      this.game.addExecution(new TrainStationExecution(this.base));
    }
    for (const { unit } of runways) {
      if (!unit.hasTrainStation()) {
        this.game.addExecution(new TrainStationExecution(unit));
      }
    }
  }

  owner(): Player {
    return this.base.owner();
  }
  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
