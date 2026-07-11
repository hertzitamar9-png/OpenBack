import {
  Execution,
  Game,
  Player,
  TerraNullius,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";

/** Builds a tank at a military base, then drives that parked tank over land. */
export class TankExecution implements Execution {
  private active = true;
  private game: Game;
  private tank: Unit | null = null;
  private target: Player | TerraNullius;
  private launched = false;
  private moveBudget = 0;

  constructor(
    private player: Player,
    private dst: TileRef,
  ) {}

  init(game: Game): void {
    this.game = game;
    if (!game.isValidRef(this.dst) || !game.hasOwner(this.dst)) {
      this.active = false;
      return;
    }
    const owner = game.owner(this.dst);
    if (owner === this.player) {
      const spawn = this.player.canBuild(UnitType.Tank, this.dst);
      const cost = game.unitInfo(UnitType.Tank).cost(game, this.player);
      if (spawn === false || this.player.gold() < cost) {
        this.active = false;
        return;
      }
      this.player.removeGold(cost);
      this.tank = this.player.buildUnit(UnitType.Tank, spawn, {
        trajectory: [],
      });
      this.tank.setLoaded(true);
      this.active = false;
      return;
    }
    if (owner.isPlayer() && !this.player.canAttackPlayer(owner)) {
      this.active = false;
      return;
    }
    const spawn = this.player.canBuild(UnitType.Tank, this.dst);
    if (spawn === false) {
      this.active = false;
      return;
    }
    this.tank =
      this.player
        .units(UnitType.Tank)
        .filter((u) => u.isActive() && u.isLoaded() === true)
        .sort(
          (a, b) =>
            game.manhattanDist(a.tile(), this.dst) -
            game.manhattanDist(b.tile(), this.dst),
        )[0] ?? null;
    if (!this.tank) {
      this.active = false;
      return;
    }
    this.target = owner;
    this.tank.setLoaded(false);
    this.tank.setTargetTile(this.dst);
    this.launched = true;
  }

  tick(): void {
    if (!this.launched || !this.tank?.isActive()) {
      this.active = false;
      return;
    }
    // Intentionally slow: roughly one land tile every four simulation ticks.
    if (++this.moveBudget < 4) return;
    this.moveBudget = 0;
    const current = this.tank.tile();
    if (current === this.dst) {
      this.tank.setReachedTarget();
      this.active = false;
      return;
    }
    const next = this.game
      .neighbors(current)
      .filter((tile) => this.game.isLand(tile))
      .sort(
        (a, b) =>
          this.game.manhattanDist(a, this.dst) -
          this.game.manhattanDist(b, this.dst),
      )[0];
    if (
      next === undefined ||
      this.game.manhattanDist(next, this.dst) >=
        this.game.manhattanDist(current, this.dst)
    ) {
      this.active = false;
      return;
    }
    this.tank.move(next);
    const mine = this.game
      .units(UnitType.TankMine)
      .find(
        (u) =>
          u.isActive() &&
          !u.isUnderConstruction() &&
          !this.player.isFriendly(u.owner()) &&
          this.game.euclideanDistSquared(next, u.tile()) <= 4,
      );
    if (mine) {
      mine.delete(false);
      this.tank.delete(false);
      this.active = false;
      return;
    }
    const owner = this.game.owner(next);
    if (
      owner.isPlayer() &&
      owner !== this.player &&
      !this.player.isFriendly(owner)
    ) {
      for (const unit of this.game.units()) {
        if (
          unit.isActive() &&
          unit.tile() === next &&
          !this.player.isFriendly(unit.owner())
        ) {
          unit.delete(false);
        }
      }
      owner.relinquish(next);
      this.player.conquer(next);
      this.game.setFallout(next, true);
    } else if (!owner.isPlayer()) {
      this.player.conquer(next);
      this.game.setFallout(next, true);
    }
  }

  owner(): Player {
    return this.player;
  }
  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
