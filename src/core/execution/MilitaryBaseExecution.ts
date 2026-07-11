import { Execution, Game, Player, Unit, UnitType } from "../game/Game";

/** Periodic fuel convoy income between a base and nearby completed runways. */
export class MilitaryBaseExecution implements Execution {
  private active = true;
  private game: Game;

  constructor(private base: Unit) {}

  init(game: Game): void {
    this.game = game;
  }

  tick(ticks: number): void {
    if (!this.base.isActive()) {
      this.active = false;
      return;
    }
    // A convoy cadence is deliberately slower than normal passive income.
    if (ticks % 200 !== this.base.id() % 200) return;
    const links = this.game.nearbyUnits(
      this.base.tile(),
      this.game.config().trainStationMaxRange(),
      [UnitType.Runway],
    );
    for (const { unit: runway } of links) {
      if (!runway.isActive() || runway.isUnderConstruction()) continue;
      const owner = this.base.owner();
      const reward =
        runway.owner() !== owner && owner.isFriendly(runway.owner())
          ? 21_000n
          : 6_000n;
      owner.addGold(reward, this.base.tile());
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
