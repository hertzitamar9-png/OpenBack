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
import type { SteppingPathFinder } from "../pathfinding/types";
import { PathStatus } from "../pathfinding/types";
import {
  registerPlaneBeachhead,
  registerPlaneLandingAnimation,
} from "./AnnexationExemptions";
import { SAMMissileExecution } from "./SAMMissileExecution";

const LOADING_TICKS = 5 * 10;
const DEPLOYMENT_WARNING_TICKS = 10 * 10;
const LANDING_PROTECTION_TICKS = 15 * 10;
const CRASH_ANIMATION_TICKS = 10;

/** Two-stage aircraft lifecycle: build/load on a runway, then launch later. */
export class PlaneExecution implements Execution {
  private active = true;
  private game: Game;
  private plane: Unit | null = null;
  private src: TileRef;
  private target: Player | TerraNullius;
  private pathFinder: SteppingPathFinder<TileRef>;
  private carriedTroops = 0;
  private loadingTicks = 0;
  private warningTicks = 0;
  private mode: "loading" | "launching" | null = null;
  private launched = false;
  private interceptionStarted = false;
  private pendingCapture: TileRef[] | null = null;
  private crashAnimationTicks = 0;

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
    this.plane.setLaunchPhase(1);
    this.pathFinder = UniversalPathFinding.Air(game);
    // Point the nose at the target from the get-go.
    this.plane.setTrajectoryAngle(this.angleTo(this.src, this.dst));
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
    if (!this.active) {
      this.active = false;
      return;
    }
    if (this.pendingCapture !== null) {
      if (this.crashAnimationTicks-- > 0) return;
      this.finishLandingCapture();
      return;
    }
    if (this.plane === null) {
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
      if (this.warningTicks === 50) this.plane.setLaunchPhase(2);
      if (this.warningTicks-- > 0) return;
      this.launched = true;
      this.plane.setLaunchPhase(0);
      this.recordMotionPlan(ticks);
      return;
    }
    const steps = Math.max(1, Math.floor(this.game.config().planeSpeed()));
    const tickStart = this.plane.tile();
    let current = tickStart;
    let interceptor: Unit | null = null;
    for (let step = 0; step < steps && this.active; step++) {
      const result = this.pathFinder.next(current, this.dst);
      if (result.status === PathStatus.COMPLETE) {
        this.crash(this.dst, true);
        return;
      }
      if (result.status !== PathStatus.NEXT) return;

      const previous = current;
      current = result.node;
      interceptor = this.findInterceptor(previous, current);
      if (interceptor !== null) {
        break;
      }
    }
    if (current !== tickStart) {
      this.plane.move(current);
      this.plane.setTrajectoryAngle(this.angleTo(tickStart, current));
    }
    if (interceptor !== null) {
      this.interceptionStarted = true;
      this.plane.setTargetedBySAM(true);
      this.game.addExecution(
        new SAMMissileExecution(
          interceptor.tile(),
          interceptor.owner(),
          interceptor,
          this.plane,
          current,
        ),
      );
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

  private findInterceptor(from: TileRef, to: TileRef): Unit | null {
    if (this.interceptionStarted) return null;
    return (
      this.game
        .units(UnitType.MANPAD)
        .find(
          (unit) =>
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            !this.player.isFriendly(unit.owner()) &&
            this.distanceToFlightSegmentSquared(unit.tile(), from, to) <=
              this.game.config().manpadRange(unit.level()) ** 2,
        ) ?? null
    );
  }

  private distanceToFlightSegmentSquared(
    tile: TileRef,
    from: TileRef,
    to: TileRef,
  ): number {
    const ax = this.game.x(from);
    const ay = this.game.y(from);
    const bx = this.game.x(to);
    const by = this.game.y(to);
    const px = this.game.x(tile);
    const py = this.game.y(tile);
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t =
      lengthSquared === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared),
          );
    const closestX = ax + dx * t;
    const closestY = ay + dy * t;
    return (px - closestX) ** 2 + (py - closestY) ** 2;
  }

  private crash(tile: TileRef, deployTroops: boolean): void {
    const radius = this.game.config().planeFalloutRadius();
    const impacted = this.game.bfs(
      tile,
      (_, next) =>
        this.game.euclideanDistSquared(tile, next) <= radius * radius,
    );
    const capturableLand: TileRef[] = [];
    const affectedOwners = new Set<Player>();
    for (const impactedTile of impacted) {
      if (!this.game.isLand(impactedTile)) continue;
      const owner = this.game.owner(impactedTile);
      if (owner.isPlayer()) {
        if (owner === this.player || this.player.isFriendly(owner)) continue;
        affectedOwners.add(owner);
        owner.relinquish(impactedTile);
      }
      this.game.setFallout(impactedTile, true);
      capturableLand.push(impactedTile);
    }
    for (const owner of affectedOwners) {
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
    }
    const capturableSet = new Set(capturableLand);
    for (const unit of this.game.units()) {
      if (
        unit.isActive() &&
        capturableSet.has(unit.tile()) &&
        unit.owner() !== this.player &&
        !this.player.isFriendly(unit.owner())
      ) {
        unit.delete(false, this.player);
      }
    }
    const plane = this.plane;
    if (plane !== null) {
      plane.setReachedTarget();
      if (plane.isActive()) plane.delete(false);
    }
    if (!deployTroops || !this.game.isLand(tile)) {
      this.active = false;
      return;
    }
    // Leave the cleared footprint glowing green briefly so every client sees
    // the crash before ownership appears. These tiles are reserved during the
    // visual phase, preventing another player from stealing the animation.
    this.pendingCapture = capturableLand;
    this.crashAnimationTicks = CRASH_ANIMATION_TICKS;
    registerPlaneLandingAnimation(
      this.game,
      capturableLand,
      CRASH_ANIMATION_TICKS + 1,
    );
  }

  private finishLandingCapture(): void {
    const capturableLand = this.pendingCapture ?? [];
    for (const impactedTile of capturableLand) {
      if (!this.game.hasOwner(impactedTile)) this.player.conquer(impactedTile);
    }
    this.player.grantLandAnnexationProtection(LANDING_PROTECTION_TICKS);
    registerPlaneBeachhead(this.game, this.player, capturableLand);
    this.pendingCapture = null;
    this.active = false;
  }

  private angleTo(from: TileRef, to: TileRef): number {
    if (from === to) return 0;
    const dx = this.game.x(to) - this.game.x(from);
    const dy = this.game.y(to) - this.game.y(from);
    // Aircraft artwork points toward local -Y, so rotate it onto the travel
    // vector instead of treating +X as the model's forward axis.
    return Math.atan2(dy, dx) + Math.PI / 2;
  }

  private trajectory(): TrajectoryTile[] {
    return (this.pathFinder.findPath(this.src, this.dst) ?? []).map((tile) => ({
      tile,
      targetable: false,
    }));
  }

  private recordMotionPlan(ticks: number): void {
    const fullPath = this.pathFinder.findPath(this.src, this.dst) ?? [this.src];
    const stride = Math.max(1, Math.floor(this.game.config().planeSpeed()));
    const path = fullPath.filter(
      (_, index) => index === 0 || index % stride === 0,
    );
    const finalTile = fullPath[fullPath.length - 1];
    if (path[path.length - 1] !== finalTile) path.push(finalTile);
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
