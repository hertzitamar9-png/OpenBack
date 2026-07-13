import { Execution, Game, Unit, UnitType } from "../game/Game";
import { TrainStationExecution } from "./TrainStationExecution";

/** Promotes a runway and nearby bases into the military fuel rail network. */
export class RunwayExecution implements Execution {
  private active = true;
  private game: Game;

  constructor(private runway: Unit) {}

  init(game: Game): void {
    this.game = game;
  }

  tick(): void {
    if (!this.runway.isActive()) {
      this.active = false;
      return;
    }
    const bases = this.game.nearbyUnits(
      this.runway.tile(),
      this.game.config().planeMaxFlightRadius(this.runway.level()),
      [UnitType.MilitaryBase],
    );
    if (bases.length === 0) {
      // A base constructed later performs the reciprocal link discovery.
      // This runway never needs to rescan its large flight radius every tick.
      this.active = false;
      return;
    }
    let hasEligibleBase = false;
    for (const { unit } of bases) {
      const range = this.game
        .config()
        .fuelRailMaxRange(unit.level(), this.runway.level());
      if (
        unit.isUnderConstruction() ||
        this.game.euclideanDistSquared(this.runway.tile(), unit.tile()) >
          range * range
      ) {
        continue;
      }
      hasEligibleBase = true;
      if (!unit.hasTrainStation()) {
        this.game.addExecution(new TrainStationExecution(unit));
      }
    }
    if (hasEligibleBase && !this.runway.hasTrainStation()) {
      this.game.addExecution(new TrainStationExecution(this.runway));
    }
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
