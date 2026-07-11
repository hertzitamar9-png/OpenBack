import {
  Execution,
  Game,
  MessageType,
  Player,
  TerraNullius,
  TrajectoryTile,
  Unit,
  UnitType,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { UniversalPathFinding } from "../pathfinding/PathFinder";
import { ParabolaUniversalPathFinder } from "../pathfinding/PathFinder.Parabola";
import { PathStatus } from "../pathfinding/types";
import { AttackExecution } from "./AttackExecution";
import { SAMMissileExecution } from "./SAMMissileExecution";

const LOADING_TICKS = 5 * 10;
const DEPLOYMENT_WARNING_TICKS = 10 * 10;

/**
 * One-use airborne deployment launched from a completed runway. The selected
 * troops are loaded immediately, the destination is telegraphed for ten
 * seconds, then the runway is consumed and the plane follows a curved route.
 */
export class PlaneExecution implements Execution {
  private active = true;
  private game: Game;
  private plane: Unit | null = null;
  private runway: Unit | null = null;
  private src: TileRef;
  private warningTicks = DEPLOYMENT_WARNING_TICKS;
  private loadingTicks = LOADING_TICKS;
  private pathFinder: ParabolaUniversalPathFinder;
  private target: Player | TerraNullius;
  private carriedTroops = 0;
  private launched = false;
  private runwayCount = 1;
  private interceptionStarted = false;

  constructor(
    private player: Player,
    private dst: TileRef,
    private requestedTroops: number,
  ) {}

  init(game: Game): void {
    this.game = game;
    if (!game.isValidRef(this.dst) || !game.hasOwner(this.dst)) {
      this.active = false;
      return;
    }
    this.target = game.owner(this.dst);
    if (
      this.target === this.player ||
      (this.target.isPlayer() && !this.player.canAttackPlayer(this.target))
    ) {
      this.active = false;
      return;
    }

    const spawn = this.player.canBuild(UnitType.Plane, this.dst);
    if (spawn === false) {
      this.active = false;
      return;
    }
    this.src = spawn;
    this.runway =
      this.player
        .units(UnitType.Runway)
        .find(
          (unit) =>
            unit.tile() === spawn &&
            unit.isActive() &&
            !unit.isUnderConstruction(),
        ) ?? null;
    if (this.runway === null) {
      this.active = false;
      return;
    }

    // Every completed runway contributes one full base flight radius.
    this.runwayCount = this.player
      .units(UnitType.Runway)
      .filter((unit) => unit.isActive() && !unit.isUnderConstruction()).length;

    // Enforce the runway-derived flight range: the destination must be within
    // the plane's maximum flight radius of the launch runway, otherwise it
    // would run out of fuel before arriving. Reject here (before any troops are
    // committed) so nothing is wasted.
    const maxFlightRadius = game
      .config()
      .planeMaxFlightRadius(this.runwayCount);
    if (
      game.euclideanDistSquared(this.src, this.dst) >
      maxFlightRadius * maxFlightRadius
    ) {
      this.active = false;
      return;
    }

    this.carriedTroops = Math.max(
      0,
      Math.min(Math.floor(this.requestedTroops), this.player.troops()),
    );
    if (this.carriedTroops <= 0) {
      this.active = false;
      return;
    }

    const speed = game.config().planeSpeed();
    this.pathFinder = UniversalPathFinding.Parabola(game, {
      increment: speed,
      distanceBasedHeight: true,
      directionUp: true,
    });
    this.plane = this.player.buildUnit(UnitType.Plane, spawn, {
      troops: this.carriedTroops,
      targetTile: this.dst,
      trajectory: this.trajectory(),
    });
    this.plane.setUnderConstruction(true);

    if (this.target.isPlayer()) {
      game.displayIncomingUnit(
        this.plane.id(),
        `${this.player.displayName()} - airborne deployment preparing`,
        MessageType.NAVAL_INVASION_INBOUND,
        this.target.id(),
      );
    }
  }

  tick(ticks: number): void {
    if (!this.active || this.plane === null) {
      this.active = false;
      return;
    }
    if (!this.plane.isActive()) {
      if (this.interceptionStarted) this.crash(this.plane.tile(), false);
      else this.active = false;
      return;
    }

    if (!this.launched) {
      // The aircraft is visibly parked on its runway while troops load.
      if (this.loadingTicks-- > 0) return;
      this.plane.setUnderConstruction(false);
      // It then remains ready on the runway during the globally visible
      // deployment warning before takeoff.
      if (this.warningTicks-- > 0) return;
      this.launched = true;
      this.recordMotionPlan(ticks);
      return;
    }

    const result = this.pathFinder.next(
      this.plane.tile(),
      this.dst,
      this.game.config().planeSpeed(),
    );
    if (result.status === PathStatus.COMPLETE) {
      this.crash(this.dst, true);
      return;
    }
    if (result.status === PathStatus.NEXT) {
      this.plane.move(result.node);
      this.plane.setTrajectoryIndex(this.pathFinder.currentIndex());
      const interceptor = this.findInterceptor(result.node);
      if (interceptor !== null) {
        this.interceptionStarted = true;
        this.plane.setTargetedBySAM(true);
        this.game.addExecution(
          new SAMMissileExecution(
            interceptor.tile(),
            interceptor.owner(),
            interceptor,
            this.plane,
            result.node,
          ),
        );
      }
    }
  }

  private findInterceptor(tile: TileRef): Unit | null {
    const rangeSquared = this.game.config().manpadRange() ** 2;
    return (
      this.game
        .units(UnitType.MANPAD)
        .find(
          (unit) =>
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            !this.interceptionStarted &&
            !this.player.isFriendly(unit.owner()) &&
            this.game.euclideanDistSquared(tile, unit.tile()) <= rangeSquared,
        ) ?? null
    );
  }

  private crash(tile: TileRef, deployTroops: boolean): void {
    const radius = this.game.config().planeFalloutRadius();
    const impacted = this.game.bfs(tile, (_, next) => {
      return this.game.euclideanDistSquared(tile, next) <= radius * radius;
    });
    for (const impactedTile of impacted) {
      if (!this.game.isLand(impactedTile)) continue;
      const owner = this.game.owner(impactedTile);
      if (owner.isPlayer()) {
        // Plane crashes have half an atom bomb's troop damage.
        const deaths = Math.floor(
          this.game
            .config()
            .nukeDeathFactor(
              UnitType.AtomBomb,
              owner.troops(),
              Math.max(1, owner.numTilesOwned()),
              this.game.config().maxTroops(owner),
            ) / 2,
        );
        owner.removeTroops(deaths);
        owner.relinquish(impactedTile);
      }
      this.game.setFallout(impactedTile, true);
    }

    this.plane?.setReachedTarget();
    if (this.plane?.isActive()) this.plane.delete(false);
    this.active = false;

    if (!deployTroops || !this.game.isLand(tile)) return;
    const target = this.target;
    this.player.conquer(tile);
    if (target.isPlayer() && this.player.isFriendly(target)) {
      this.player.addTroops(this.carriedTroops);
      return;
    }
    this.game.addExecution(
      new AttackExecution(
        this.carriedTroops,
        this.player,
        target.id(),
        tile,
        false,
      ),
    );
  }

  private trajectory(): TrajectoryTile[] {
    return (this.pathFinder.findPath(this.src, this.dst) ?? []).map((tile) => ({
      tile,
      targetable: false,
    }));
  }

  private recordMotionPlan(ticks: number): void {
    if (this.plane === null) return;
    const path = this.pathFinder.findPath(this.src, this.dst) ?? [this.src];
    this.game.recordMotionPlan({
      kind: "grid",
      unitId: this.plane.id(),
      planId: 1,
      startTick: ticks + 1,
      ticksPerStep: 1,
      path,
    });
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
