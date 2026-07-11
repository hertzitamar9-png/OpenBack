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

/** Two-stage aircraft lifecycle: build/load on a runway, then launch later. */
export class PlaneExecution implements Execution {
  private active = true;
  private game: Game;
  private plane: Unit | null = null;
  private src: TileRef;
  private target: Player | TerraNullius;
  private pathFinder: ParabolaUniversalPathFinder;
  private carriedTroops = 0;
  private loadingTicks = 0;
  private warningTicks = 0;
  private mode: "loading" | "launching" | null = null;
  private launched = false;
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

    const completedRunways = this.completedRunways();
    const owner = game.owner(this.dst);

    // Stage one: clicking on (or near) a completed owned runway builds and
    // loads a plane on it. canBuild snaps to the nearest runway without a
    // parked plane so the click doesn't have to be pixel-perfect.
    if (owner === this.player) {
      const spawn = this.player.canBuild(UnitType.Plane, this.dst);
      const cost = game.unitInfo(UnitType.Plane).cost(game, this.player);
      if (spawn === false || this.player.gold() < cost) {
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
      this.src = spawn;
      this.mode = "loading";
      this.loadingTicks = LOADING_TICKS;
      this.plane = this.player.buildUnit(UnitType.Plane, this.src, {
        troops: this.carriedTroops,
        trajectory: [],
      });
      this.plane.setLoaded(false);
      this.plane.setUnderConstruction(true);
      return;
    }

    // Stage two: an enemy destination launches the closest ready plane whose
    // runway stack covers that tile.
    if (owner.isPlayer() && !this.player.canAttackPlayer(owner)) {
      this.active = false;
      return;
    }
    this.plane = this.closestReadyPlaneInRange(completedRunways);
    if (this.plane === null) {
      this.active = false;
      return;
    }
    this.src = this.plane.tile();
    this.target = owner;
    this.carriedTroops = this.plane.troops();
    this.mode = "launching";
    this.warningTicks = DEPLOYMENT_WARNING_TICKS;
    this.plane.setLoaded(false);
    this.plane.setTargetTile(this.dst);
    const speed = game.config().planeSpeed();
    this.pathFinder = UniversalPathFinding.Parabola(game, {
      increment: speed,
      distanceBasedHeight: true,
      directionUp: true,
    });
    this.plane.setTrajectory(this.trajectory());
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
    if (this.mode === "loading") {
      if (this.loadingTicks-- > 0) return;
      this.plane.setUnderConstruction(false);
      this.plane.setLoaded(true);
      this.active = false;
      return;
    }
    if (this.mode !== "launching") {
      this.active = false;
      return;
    }
    if (!this.launched) {
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

  private completedRunways(): Unit[] {
    return this.player
      .units(UnitType.Runway)
      .filter((u) => u.isActive() && !u.isUnderConstruction());
  }

  private closestReadyPlaneInRange(runways: Unit[]): Unit | null {
    let best: Unit | null = null;
    let bestDistance = Infinity;
    for (const plane of this.player.units(UnitType.Plane)) {
      if (
        !plane.isActive() ||
        plane.isUnderConstruction() ||
        plane.isLoaded() !== true
      ) {
        continue;
      }
      const stack = runways
        .filter((r) => r.tile() === plane.tile())
        .reduce((sum, runway) => sum + runway.level(), 0);
      const range = this.game.config().planeMaxFlightRadius(stack);
      const distance = this.game.euclideanDistSquared(plane.tile(), this.dst);
      if (stack > 0 && distance <= range * range && distance < bestDistance) {
        best = plane;
        bestDistance = distance;
      }
    }
    return best;
  }

  private findInterceptor(tile: TileRef): Unit | null {
    if (this.interceptionStarted) return null;
    const rangeSquared = this.game.config().manpadRange() ** 2;
    return (
      this.game
        .units(UnitType.MANPAD)
        .find(
          (unit) =>
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            !this.player.isFriendly(unit.owner()) &&
            this.game.euclideanDistSquared(tile, unit.tile()) <= rangeSquared,
        ) ?? null
    );
  }

  private crash(tile: TileRef, deployTroops: boolean): void {
    const radius = this.game.config().planeFalloutRadius();
    const impacted = this.game.bfs(
      tile,
      (_, next) =>
        this.game.euclideanDistSquared(tile, next) <= radius * radius,
    );
    const clearedLand: TileRef[] = [];
    for (const impactedTile of impacted) {
      if (!this.game.isLand(impactedTile)) continue;
      const owner = this.game.owner(impactedTile);
      if (owner.isPlayer()) {
        const deaths = Math.floor(
          this.game
            .config()
            .nukeDeathFactor(
              UnitType.AtomBomb,
              owner.troops(),
              Math.max(1, owner.numTilesOwned()),
              this.game.config().maxTroops(owner),
            ) / 4,
        );
        owner.removeTroops(deaths);
        if (owner !== this.player) {
          owner.relinquish(impactedTile);
          clearedLand.push(impactedTile);
        }
      }
      this.game.setFallout(impactedTile, true);
    }
    const plane = this.plane;
    if (plane !== null) {
      plane.setReachedTarget();
      if (plane.isActive()) plane.delete(false);
    }
    this.active = false;
    if (!deployTroops || !this.game.isLand(tile)) return;
    // Grab the crater the blast just cleared, then push the carried troops
    // outward from it to take the surrounding bombed land.
    this.player.conquer(tile);
    for (const cleared of clearedLand) {
      this.player.conquer(cleared);
    }
    this.game.addExecution(
      new AttackExecution(
        this.carriedTroops,
        this.player,
        this.target.isPlayer() ? this.target.id() : null,
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
    const path = this.pathFinder.findPath(this.src, this.dst) ?? [this.src];
    this.game.recordMotionPlan({
      kind: "grid",
      unitId: this.plane!.id(),
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
