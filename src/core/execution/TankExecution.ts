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
        .find(
          (unit) =>
            unit.isActive() &&
            unit.isLoaded() === true &&
            unit.tile() === spawn,
        ) ?? null;
    if (!this.tank) {
      this.active = false;
      return;
    }
    this.target = owner;
    this.tank.setLoaded(false);
    this.tank.setTargetTile(this.dst);
    this.tank.setTrajectoryAngle(this.angleTo(this.tank.tile(), this.dst));
    this.launched = true;
  }

  tick(): void {
    if (!this.launched || !this.tank?.isActive()) {
      this.active = false;
      return;
    }
    // Cover four land tiles per simulation tick. Each intermediate tile still
    // checks mines and applies damage, so the speed-up cannot skip defenses.
    for (let step = 0; step < 4 && this.active; step++) {
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
      // Keep the hull/turret aimed downrange, including on diagonal paths.
      this.tank.setTrajectoryAngle(this.angleTo(next, this.dst));
      const mine = this.game
        .units(UnitType.TankMine)
        .find(
          (u) =>
            u.isActive() &&
            !u.isUnderConstruction() &&
            !this.player.isFriendly(u.owner()) &&
            this.game.euclideanDistSquared(next, u.tile()) <=
              this.game.config().tankMineRange(u.level()) ** 2,
        );
      if (mine) {
        mine.decreaseLevel(this.player);
        this.tank.delete(false);
        this.active = false;
        return;
      }
      this.damageArea(next);
    }
  }

  private angleTo(from: TileRef, to: TileRef): number {
    if (from === to) return this.tank?.trajectoryAngle() ?? 0;
    const dx = this.game.x(to) - this.game.x(from);
    const dy = this.game.y(to) - this.game.y(from);
    return Math.atan2(dx, -dy);
  }

  private damageArea(center: TileRef): void {
    const radius = this.game.config().tankDamageRadius();
    const radiusSquared = radius * radius;

    for (const unit of this.game.units()) {
      if (
        unit.isActive() &&
        unit !== this.tank &&
        unit.owner() !== this.player &&
        !this.player.isFriendly(unit.owner()) &&
        this.game.euclideanDistSquared(center, unit.tile()) <= radiusSquared
      ) {
        unit.delete(false, this.player);
      }
    }

    for (const tile of this.game.bfs(
      center,
      (_, next) =>
        this.game.euclideanDistSquared(center, next) <= radiusSquared,
    )) {
      if (!this.game.isLand(tile)) continue;
      const owner = this.game.owner(tile);
      if (
        owner.isPlayer() &&
        (owner === this.player || this.player.isFriendly(owner))
      ) {
        continue;
      }
      if (owner.isPlayer()) owner.relinquish(tile);
      this.game.setFallout(tile, true);
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
