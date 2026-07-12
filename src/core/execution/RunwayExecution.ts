import { Execution, Game, Unit, UnitType } from "../game/Game";
import { TrainStationExecution } from "./TrainStationExecution";

/** Promotes a runway and nearby bases into the military fuel rail network. */
export class RunwayExecution implements Execution {
  private active = true;
  private game: Game;
  private linked = false;

  constructor(private runway: Unit) {}

  init(game: Game): void {
    this.game = game;
  }

  tick(): void {
    if (!this.runway.isActive()) {
      this.active = false;
      return;
    }
    if (this.linked) return;
    const bases = this.game.nearbyUnits(
      this.runway.tile(),
      this.game.config().trainStationMaxRange(),
      [UnitType.MilitaryBase],
    );
    if (bases.length === 0) return;
    if (!this.runway.hasTrainStation()) {
      this.game.addExecution(new TrainStationExecution(this.runway));
    }
    for (const { unit } of bases) {
      if (!unit.isUnderConstruction() && !unit.hasTrainStation()) {
        this.game.addExecution(new TrainStationExecution(unit));
      }
    }
    this.linked = true;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
