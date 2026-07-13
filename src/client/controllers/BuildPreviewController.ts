/**
 * BuildPreviewController — build-ghost state machine + click-to-build flow.
 *
 * All rendering for the build ghost (outline, range circle, rail snap,
 * crosshair) lives in the WebGL renderer. This controller owns the state:
 * it queries buildables for the cursor tile, tracks whether the placement
 * is valid, and pushes preview data straight to the WebGL view.
 */

import { EventBus } from "../../core/EventBus";
import {
  listNukeBreakAlliance,
  wouldNukeBreakAlliance,
} from "../../core/execution/Util";
import {
  BuildableUnit,
  PlayerBuildableUnitType,
  UnitType,
} from "../../core/game/Game";
import { TileRef } from "../../core/game/GameMap";
import { UserSettings } from "../../core/game/UserSettings";
import { Controller } from "../Controller";
import {
  ConfirmGhostStructureEvent,
  MouseMoveEvent,
  MouseUpEvent,
} from "../InputHandler";
import { MapRenderer, buildNukeTrajectory } from "../render/gl";
import type { SAMInfo } from "../render/gl/utils/NukeTrajectory";
import type { GhostPreviewData } from "../render/types";
import { TransformHandler } from "../TransformHandler";
import {
  BuildUnitIntentEvent,
  SendUpgradeStructureIntentEvent,
} from "../Transport";
import { UIState } from "../UIState";
import { GameView } from "../view";

/** True for nuke types (AtomBomb, HydrogenBomb): ghost is preserved after placement so user can place multiple or keep selection (Enter/key confirm). */
export function shouldPreserveGhostAfterBuild(unitType: UnitType): boolean {
  return unitType === UnitType.AtomBomb || unitType === UnitType.HydrogenBomb;
}

const STACKABLE_OPENBACK_TYPES: ReadonlySet<UnitType> = new Set([
  UnitType.Runway,
  UnitType.MANPAD,
  UnitType.MilitaryBase,
  UnitType.TankMine,
]);

/**
 * Whether a SAM belongs in the nuke trajectory preview's threat set.
 * Mirrors SAMLauncherExecution: a SAM ignores a nuke whose owner it's
 * friendly with (same team OR allied).
 * Teammates are excluded unconditionally — a strike can break an alliance
 * but never a team relationship, so a teammate's SAM never engages.
 * Allied SAMs are excluded unless the strike would betray that ally — the
 * alliance breaks at launch, so their SAMs will engage the nuke.
 * (Own SAMs never threaten; the caller filters those out first.)
 */
export function samThreatensNukePreview(
  samOwnerSmallId: number,
  teammateSmallIds: ReadonlySet<number>,
  allySmallIds: ReadonlySet<number>,
  betrayedSmallIds: ReadonlySet<number>,
): boolean {
  if (teammateSmallIds.has(samOwnerSmallId)) return false;
  return (
    !allySmallIds.has(samOwnerSmallId) || betrayedSmallIds.has(samOwnerSmallId)
  );
}

export class BuildPreviewController implements Controller {
  /** Current ghost (null when no build type is active). */
  private ghostUnit: { buildableUnit: BuildableUnit } | null = null;
  private readonly connectedAllySmallIds: Set<number> = new Set();
  private readonly mousePos = { x: 0, y: 0 };
  private lastGhostQueryAt: number = 0;
  private ghostQueryInFlight = false;
  private ghostQueryGeneration = 0;
  private validatedTileRef: TileRef | undefined;
  private pendingConfirm: MouseUpEvent | null = null;

  // Buildable validation runs on the snapped tile under the cursor, but the
  // rendered icon follows the cursor at sub-tile precision so motion is
  // continuous instead of stepping tile-to-tile. cursorLoop re-emits each
  // frame with the current cursor world position.
  private lastGhostData: GhostPreviewData | null = null;

  // Static inputs for the nuke trajectory preview (source silo + threatening
  // SAMs). Recomputed in the throttled renderGhost path; cursorLoop rebuilds
  // the Bezier each frame with the live cursor position as the destination so
  // the arc tracks the cursor smoothly instead of snapping tile-to-tile.
  private nukeTrajectoryStatic: {
    srcX: number;
    srcY: number;
    sams: SAMInfo[];
  } | null = null;

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    public uiState: UIState,
    private transformHandler: TransformHandler,
    private view: MapRenderer,
    private userSettings: UserSettings,
  ) {}

  init() {
    this.eventBus.on(MouseMoveEvent, (e) => this.moveGhost(e));
    this.eventBus.on(MouseUpEvent, (e) => this.requestConfirmStructure(e));
    this.eventBus.on(ConfirmGhostStructureEvent, () =>
      this.requestConfirmStructure(
        new MouseUpEvent(this.mousePos.x, this.mousePos.y),
      ),
    );

    // Re-emit the ghost each render frame at the cursor's current world
    // position (sub-tile). Buildable validation still runs on the snapped
    // tile in renderGhost(); this loop just keeps the icon under the cursor
    // so motion is continuous instead of stepping tile-to-tile.
    // The shader treats (tileX + 0.5, tileY + 0.5) as the icon center (so an
    // integer tile coord centers on that tile), so we subtract 0.5 here to
    // place the icon exactly under the cursor.
    const cursorLoop = () => {
      const ghost = this.lastGhostData;
      const traj = this.nukeTrajectoryStatic;
      if (ghost !== null || traj !== null) {
        const w = this.transformHandler.screenToWorldCoordinatesFloat(
          this.mousePos.x,
          this.mousePos.y,
        );
        if (ghost !== null) {
          // The range circle (defense post / SAM / nuke radius) normally
          // follows the cursor, so smooth it the same way as the icon. When
          // upgrading, the circle is anchored to the existing structure's tile
          // (stationary, correctly snapped) — leave it alone in that case.
          // Snapped plane/runway placement is likewise anchored to the runway
          // it snapped to, so its flight-range circle stays put too.
          const anchoredToSnappedRunway =
            ghost.ghostType === UnitType.Runway && ghost.canBuild;
          const anchoredVehicleRange =
            (ghost.ghostType === UnitType.Plane ||
              ghost.ghostType === UnitType.Tank) &&
            ghost.rangeRadius > 0;
          const radiusFollowsCursor = !(
            (ghost.canUpgrade && ghost.upgradeTargetTile !== null) ||
            ghost.snapTargetTile !== null ||
            anchoredToSnappedRunway ||
            anchoredVehicleRange
          );
          this.view.updateGhostPreview({
            ...ghost,
            ...(ghost.snapTargetTile === null
              ? { tileX: w.x - 0.5, tileY: w.y - 0.5 }
              : {}),
            ...(radiusFollowsCursor
              ? { radiusTileX: w.x - 0.5, radiusTileY: w.y - 0.5 }
              : {}),
          });
        }
        if (traj !== null) {
          // Rebuild the arc with the live cursor as the destination (same
          // tile-center convention as the icon: shader adds +0.5).
          this.view.updateNukeTrajectory(
            buildNukeTrajectory(
              traj.srcX,
              traj.srcY,
              w.x - 0.5,
              w.y - 0.5,
              this.game.height(),
              this.uiState.rocketDirectionUp,
              traj.sams,
            ),
          );
        }
      }
      requestAnimationFrame(cursorLoop);
    };
    requestAnimationFrame(cursorLoop);
  }

  tick() {
    // Re-query buildables periodically (world state can change — tiles may
    // become buildable as troops/territory move).
    this.syncGhostState();
    this.renderGhost();
  }

  /**
   * Reconcile our internal ghost state with uiState.ghostStructure. Other
   * UI bits (build menu, key bindings) toggle uiState; we mirror it here.
   */
  private syncGhostState(): void {
    const target = this.uiState.ghostStructure;
    if (this.ghostUnit) {
      if (target === null) {
        this.removeGhostStructure();
      } else if (target !== this.ghostUnit.buildableUnit.type) {
        this.clearGhostStructure();
        this.createGhostStructure(target);
      }
    } else if (target !== null) {
      this.createGhostStructure(target);
    }
  }

  renderGhost() {
    if (!this.ghostUnit) return;

    const now = performance.now();
    if (this.ghostQueryInFlight || now - this.lastGhostQueryAt < 35) return;
    this.lastGhostQueryAt = now;
    let tileRef: TileRef | undefined;
    const tile = this.transformHandler.screenToWorldCoordinates(
      this.mousePos.x,
      this.mousePos.y,
    );
    if (this.game.isValidCoord(tile.x, tile.y)) {
      tileRef = this.game.ref(tile.x, tile.y);
    }

    // Check if targeting an ally (for nuke warning visual)
    let targetingAlly = false;
    const myPlayer = this.game.myPlayer();
    const nukeType = this.ghostUnit.buildableUnit.type;
    if (
      tileRef &&
      myPlayer &&
      (nukeType === UnitType.AtomBomb || nukeType === UnitType.HydrogenBomb)
    ) {
      this.connectedAllySmallIds.clear();
      const allies = myPlayer.allies();
      for (let i = 0; i < allies.length; i++) {
        const ally = allies[i];
        if (!ally.isDisconnected()) {
          this.connectedAllySmallIds.add(ally.smallID());
        }
      }

      if (this.connectedAllySmallIds.size > 0) {
        targetingAlly = wouldNukeBreakAlliance({
          game: this.game,
          targetTile: tileRef,
          magnitude: this.game.config().nukeMagnitudes(nukeType),
          allySmallIds: this.connectedAllySmallIds,
          threshold: this.game.config().nukeAllianceBreakThreshold(),
        });
      }
    }

    const player = this.game.myPlayer();
    if (!player) return;
    const requestedType = this.ghostUnit.buildableUnit.type;
    const generation = this.ghostQueryGeneration;
    this.ghostQueryInFlight = true;
    player
      .buildables(tileRef, [requestedType])
      .then((buildables) => {
        if (
          !this.ghostUnit ||
          generation !== this.ghostQueryGeneration ||
          this.ghostUnit.buildableUnit.type !== requestedType
        ) {
          return;
        }

        // Worker replies are asynchronous. Never let a result for an old
        // cursor tile overwrite the current grey/white placement state.
        if (this.currentCursorTileRef() !== tileRef) {
          this.lastGhostQueryAt = 0;
          return;
        }

        this.validatedTileRef = tileRef;

        const unit = buildables.find((u) => u.type === requestedType);
        if (!unit) {
          Object.assign(this.ghostUnit.buildableUnit, {
            canBuild: false,
            canUpgrade: false,
          });
          this.pendingConfirm = null;
          this.emitGhostPreview(tileRef, targetingAlly);
          return;
        }

        this.ghostUnit.buildableUnit = unit;

        if (this.pendingConfirm !== null) {
          const ev = this.pendingConfirm;
          this.pendingConfirm = null;
          if (this.isGhostReadyForConfirm()) {
            this.createStructure(ev);
          }
        }

        this.emitGhostPreview(tileRef, targetingAlly);
      })
      .catch((error) => {
        console.error("Failed to validate build preview", error);
      })
      .finally(() => {
        this.ghostQueryInFlight = false;
        if (this.currentCursorTileRef() !== tileRef) {
          this.lastGhostQueryAt = 0;
        }
      });
  }

  private currentCursorTileRef(): TileRef | undefined {
    const tile = this.transformHandler.screenToWorldCoordinates(
      this.mousePos.x,
      this.mousePos.y,
    );
    return this.game.isValidCoord(tile.x, tile.y)
      ? this.game.ref(tile.x, tile.y)
      : undefined;
  }

  /**
   * Push a GhostPreviewData snapshot to the WebGL view (StructurePass /
   * RangeCirclePass / RailroadPass / CrosshairPass all read it). null when
   * the ghost can't be placed. smoothLoop interpolates displayed position
   * toward the target tile each frame.
   */
  private emitGhostPreview(
    tileRef: TileRef | undefined,
    targetingAlly: boolean,
  ): void {
    const data = this.buildGhostPreviewData(tileRef, targetingAlly);
    if (data === null) {
      this.lastGhostData = null;
      this.view.updateGhostPreview(null);
    } else {
      this.lastGhostData = data;
    }
    this.updateNukeTrajectoryPreview(tileRef);
  }

  /**
   * For AtomBomb / HydrogenBomb ghosts, push the Bezier trajectory preview
   * (closest player-owned silo → target, accounting for non-allied SAMs).
   * Cleared whenever the ghost isn't a nuke, has no target, or the player
   * has no silos.
   */
  private updateNukeTrajectoryPreview(tileRef: TileRef | undefined): void {
    if (!this.ghostUnit || tileRef === undefined) {
      this.clearNukeTrajectory();
      return;
    }
    const type = this.ghostUnit.buildableUnit.type;
    if (type !== UnitType.AtomBomb && type !== UnitType.HydrogenBomb) {
      this.clearNukeTrajectory();
      return;
    }
    const myPlayer = this.game.myPlayer();
    if (!myPlayer) {
      this.clearNukeTrajectory();
      return;
    }

    // Mirror PlayerImpl.nukeSpawn (the source NukeExecution actually fires
    // from): only silos that are active, not reloading, and not under
    // construction are eligible, and the nearest is chosen by Manhattan
    // distance. Keeping these in sync prevents the preview arc from
    // originating from a silo the game wouldn't use.
    const silos = myPlayer
      .units(UnitType.MissileSilo)
      .filter(
        (u) => u.isActive() && !u.isInCooldown() && !u.isUnderConstruction(),
      );
    if (silos.length === 0) {
      this.clearNukeTrajectory();
      return;
    }

    const dstX = this.game.x(tileRef);
    const dstY = this.game.y(tileRef);
    let bestSilo = silos[0];
    let bestDist = Infinity;
    for (const s of silos) {
      const sx = this.game.x(s.tile());
      const sy = this.game.y(s.tile());
      const d = Math.abs(sx - dstX) + Math.abs(sy - dstY);
      if (d < bestDist) {
        bestDist = d;
        bestSilo = s;
      }
    }
    const srcX = this.game.x(bestSilo.tile());
    const srcY = this.game.y(bestSilo.tile());

    // Non-friendly SAMs threaten the trajectory; own + teammate + allied SAMs
    // don't — except allies this strike would betray: the alliance breaks at
    // launch (NukeExecution.maybeBreakAlliances), so their SAMs will intercept.
    // Teammates have no such exception (a strike never breaks a team).
    // listNukeBreakAlliance is the same function the sim uses there.
    const teammateIds = new Set<number>();
    for (const p of this.game.players()) {
      if (myPlayer.isOnSameTeam(p)) teammateIds.add(p.smallID());
    }
    const allyIds = new Set<number>();
    for (const a of myPlayer.allies()) allyIds.add(a.smallID());
    const betrayedIds: ReadonlySet<number> =
      allyIds.size > 0
        ? listNukeBreakAlliance({
            game: this.game,
            targetTile: tileRef,
            magnitude: this.game.config().nukeMagnitudes(type),
            threshold: this.game.config().nukeAllianceBreakThreshold(),
          })
        : new Set();
    const sams: SAMInfo[] = [];
    for (const s of this.game.units(UnitType.SAMLauncher)) {
      if (!s.isActive()) continue;
      const owner = s.owner();
      if (owner === myPlayer) continue;
      if (
        !samThreatensNukePreview(
          owner.smallID(),
          teammateIds,
          allyIds,
          betrayedIds,
        )
      ) {
        continue;
      }
      const r = this.game.config().samRange(s.level());
      sams.push({
        x: this.game.x(s.tile()),
        y: this.game.y(s.tile()),
        rangeSq: r * r,
      });
    }

    // Stash the static inputs; cursorLoop rebuilds the Bezier each frame with
    // the live cursor as the destination so the arc tracks smoothly.
    this.nukeTrajectoryStatic = { srcX, srcY, sams };
  }

  private clearNukeTrajectory(): void {
    this.nukeTrajectoryStatic = null;
    this.view.updateNukeTrajectory(null);
  }

  private buildGhostPreviewData(
    tileRef: TileRef | undefined,
    targetingAlly: boolean,
  ): GhostPreviewData | null {
    if (!this.ghostUnit) return null;
    if (tileRef === undefined) return null;
    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return null;

    const u = this.ghostUnit.buildableUnit;

    const snapTargetTile =
      STACKABLE_OPENBACK_TYPES.has(u.type) &&
      u.canBuild !== false &&
      myPlayer
        .units(u.type as UnitType.Runway)
        .some(
          (unit) =>
            unit.isActive() &&
            !unit.isUnderConstruction() &&
            unit.tile() === u.canBuild,
        )
        ? u.canBuild
        : null;

    // Upgrade-target tile — only when upgrading an existing unit.
    let upgradeTargetTile: number | null = null;
    if (u.canUpgrade !== false) {
      upgradeTargetTile = this.game.unit(u.canUpgrade)?.tile() ?? null;
    }

    // Range circle: SAM placement preview shows targetable radius; nuke
    // previews show the outer blast radius at the target tile.
    let rangeRadius = 0;
    let vehicleRangeSourceTile: TileRef | null = null;
    switch (u.type) {
      case UnitType.SAMLauncher: {
        const level = this.resolveGhostRangeLevel(u) ?? 1;
        rangeRadius = this.game.config().samRange(level);
        break;
      }
      case UnitType.AtomBomb:
      case UnitType.HydrogenBomb:
        rangeRadius = this.game.config().nukeMagnitudes(u.type).outer;
        break;
      case UnitType.Factory:
        rangeRadius = this.game.config().trainStationMaxRange();
        break;
      case UnitType.DefensePost:
        rangeRadius = this.game.config().defensePostRange();
        break;
      case UnitType.MANPAD: {
        const stackTile = u.canBuild !== false ? u.canBuild : tileRef;
        const level =
          myPlayer
            .units(UnitType.MANPAD)
            .filter(
              (unit) =>
                !unit.isUnderConstruction() && unit.tile() === stackTile,
            )
            .reduce((sum, unit) => sum + unit.level(), 0) + 1;
        rangeRadius = this.game.config().manpadRange(level);
        break;
      }
      case UnitType.TankMine: {
        const stackTile = u.canBuild !== false ? u.canBuild : tileRef;
        const level =
          myPlayer
            .units(UnitType.TankMine)
            .filter(
              (unit) =>
                !unit.isUnderConstruction() && unit.tile() === stackTile,
            )
            .reduce((sum, unit) => sum + unit.level(), 0) + 1;
        rangeRadius = this.game.config().tankMineRange(level);
        break;
      }
      case UnitType.MilitaryBase: {
        const stackTile = u.canBuild !== false ? u.canBuild : tileRef;
        const level =
          myPlayer
            .units(UnitType.MilitaryBase)
            .filter(
              (unit) =>
                !unit.isUnderConstruction() && unit.tile() === stackTile,
            )
            .reduce((sum, unit) => sum + unit.level(), 0) + 1;
        rangeRadius = this.game.config().tankMaxDriveRadius(level);
        break;
      }
      case UnitType.Runway: {
        // canBuild snaps to a nearby runway when stacking; anchor/measure the
        // preview on that snapped tile so it reflects the stacked level.
        const runwayTile = u.canBuild !== false ? u.canBuild : tileRef;
        const completed = myPlayer
          .units(UnitType.Runway)
          .filter(
            (runway) =>
              !runway.isUnderConstruction() && runway.tile() === runwayTile,
          )
          .reduce((sum, runway) => sum + runway.level(), 0);
        rangeRadius = this.game.config().planeMaxFlightRadius(completed + 1);
        break;
      }
      case UnitType.Plane: {
        const runwayTile = this.hoveredCompletedSourceTile(
          myPlayer,
          UnitType.Runway,
          tileRef,
        );
        if (runwayTile === null) {
          rangeRadius = 0;
          break;
        }
        vehicleRangeSourceTile = runwayTile;
        const stack = myPlayer
          .units(UnitType.Runway)
          .filter(
            (runway) =>
              !runway.isUnderConstruction() && runway.tile() === runwayTile,
          )
          .reduce((sum, runway) => sum + runway.level(), 0);
        rangeRadius = this.game.config().planeMaxFlightRadius(stack);
        break;
      }
      case UnitType.Tank: {
        const baseTile = this.hoveredCompletedSourceTile(
          myPlayer,
          UnitType.MilitaryBase,
          tileRef,
        );
        if (baseTile === null) {
          rangeRadius = 0;
          break;
        }
        vehicleRangeSourceTile = baseTile;
        const level = myPlayer
          .units(UnitType.MilitaryBase)
          .filter(
            (unit) => !unit.isUnderConstruction() && unit.tile() === baseTile,
          )
          .reduce((sum, unit) => sum + unit.level(), 0);
        rangeRadius = this.game.config().tankMaxDriveRadius(level);
        break;
      }
    }
    let radiusTileX = this.game.x(tileRef);
    let radiusTileY = this.game.y(tileRef);
    if (
      (u.type === UnitType.Runway ||
        u.type === UnitType.MANPAD ||
        u.type === UnitType.MilitaryBase ||
        u.type === UnitType.TankMine) &&
      u.canBuild !== false
    ) {
      radiusTileX = this.game.x(u.canBuild);
      radiusTileY = this.game.y(u.canBuild);
    }
    if (vehicleRangeSourceTile !== null) {
      radiusTileX = this.game.x(vehicleRangeSourceTile);
      radiusTileY = this.game.y(vehicleRangeSourceTile);
    }
    if (
      rangeRadius > 0 &&
      u.canUpgrade !== false &&
      upgradeTargetTile !== null
    ) {
      radiusTileX = this.game.x(upgradeTargetTile);
      radiusTileY = this.game.y(upgradeTargetTile);
    }

    const cost = u.cost;
    return {
      ghostType: u.type,
      tileX: this.game.x(snapTargetTile ?? tileRef),
      tileY: this.game.y(snapTargetTile ?? tileRef),
      radiusTileX,
      radiusTileY,
      canBuild: u.canBuild !== false,
      canUpgrade: u.canUpgrade !== false,
      cost: Number(cost),
      showCost: this.userSettings.cursorCostLabel(),
      canAfford: myPlayer.gold() >= cost,
      ghostRailPaths: u.ghostRailPaths,
      overlappingRailroads: u.overlappingRailroads,
      ownerID: myPlayer.smallID(),
      upgradeTargetTile,
      snapTargetTile,
      rangeRadius,
      rangeWarning: targetingAlly,
    };
  }

  private isGhostReadyForConfirm(): boolean {
    if (!this.ghostUnit) return false;
    const bu = this.ghostUnit.buildableUnit;
    return bu.canBuild !== false || bu.canUpgrade !== false;
  }

  private requestConfirmStructure(e: MouseUpEvent): void {
    if (!this.ghostUnit && !this.uiState.ghostStructure) return;
    if (this.isGhostReadyForConfirm()) {
      this.createStructure(e);
    } else {
      this.pendingConfirm = e;
    }
  }

  private createStructure(e: MouseUpEvent) {
    if (!this.ghostUnit) return;
    if (
      this.ghostUnit.buildableUnit.canBuild === false &&
      this.ghostUnit.buildableUnit.canUpgrade === false
    ) {
      this.removeGhostStructure();
      return;
    }
    const tile = this.transformHandler.screenToWorldCoordinates(e.x, e.y);
    if (this.ghostUnit.buildableUnit.canUpgrade !== false) {
      this.eventBus.emit(
        new SendUpgradeStructureIntentEvent(
          this.ghostUnit.buildableUnit.canUpgrade,
          this.ghostUnit.buildableUnit.type,
        ),
      );
      this.removeGhostStructure();
    } else if (this.ghostUnit.buildableUnit.canBuild) {
      const unitType = this.ghostUnit.buildableUnit.type;
      const rocketDirectionUp =
        unitType === UnitType.AtomBomb || unitType === UnitType.HydrogenBomb
          ? this.uiState.rocketDirectionUp
          : undefined;
      this.eventBus.emit(
        new BuildUnitIntentEvent(
          unitType,
          this.game.ref(tile.x, tile.y),
          rocketDirectionUp,
          unitType === UnitType.Plane
            ? Math.floor(
                (this.game.myPlayer()?.troops() ?? 0) *
                  this.uiState.attackRatio,
              )
            : undefined,
        ),
      );
      if (!shouldPreserveGhostAfterBuild(unitType)) {
        this.removeGhostStructure();
      }
    } else {
      this.removeGhostStructure();
    }
  }

  private moveGhost(e: MouseMoveEvent) {
    this.mousePos.x = e.x;
    this.mousePos.y = e.y;
    const currentTile = this.currentCursorTileRef();
    if (this.ghostUnit !== null && currentTile !== this.validatedTileRef) {
      // Keep the last confirmed white/grey state while the worker validates
      // the new tile. The single-flight query below guarantees an old reply
      // cannot win, so there is no reason to flash grey between valid tiles.
      this.lastGhostQueryAt = 0;
      // Mouse movement is much more frequent than the simulation tick. Start
      // validation now so re-entering a vehicle radius updates immediately.
      // The in-flight guard and stale-tile check keep the colour stable.
      this.renderGhost();
    }
    this.updateHoveredSourceRange();
  }

  private updateHoveredSourceRange(): void {
    if (this.uiState.ghostStructure !== null || this.ghostUnit !== null) {
      this.view.updateHoverRange(null);
      return;
    }
    const player = this.game.myPlayer();
    if (!player) return;
    const hover = this.transformHandler.screenToWorldCoordinates(
      this.mousePos.x,
      this.mousePos.y,
    );
    if (!this.game.isValidCoord(hover.x, hover.y)) {
      this.view.updateHoverRange(null);
      return;
    }
    const hoverTile = this.game.ref(hover.x, hover.y);
    const maxDistance = this.game.config().openBackVehicleSnapRadius() ** 2;
    let best: { tile: TileRef; radius: number; distance: number } | undefined;
    for (const type of [UnitType.Runway, UnitType.MilitaryBase] as const) {
      for (const unit of player.units(type)) {
        if (!unit.isActive() || unit.isUnderConstruction()) continue;
        const distance = this.game.euclideanDistSquared(unit.tile(), hoverTile);
        if (distance > maxDistance || (best && distance >= best.distance)) {
          continue;
        }
        const radius =
          type === UnitType.Runway
            ? this.game.config().planeMaxFlightRadius(unit.level())
            : this.game.config().tankMaxDriveRadius(unit.level());
        best = { tile: unit.tile(), radius, distance };
      }
    }
    this.view.updateHoverRange(
      best
        ? {
            x: this.game.x(best.tile),
            y: this.game.y(best.tile),
            radius: best.radius,
          }
        : null,
    );
  }

  private createGhostStructure(type: PlayerBuildableUnitType | null) {
    if (type === null) return;
    if (this.game.myPlayer() === null) return;
    this.ghostUnit = {
      buildableUnit: {
        type,
        canBuild: false,
        canUpgrade: false,
        cost: 0n,
        overlappingRailroads: [],
        ghostRailPaths: [],
      },
    };
    this.ghostQueryGeneration++;
    this.validatedTileRef = undefined;
    this.lastGhostQueryAt = 0;
  }

  private clearGhostStructure() {
    this.ghostQueryGeneration++;
    this.validatedTileRef = undefined;
    this.pendingConfirm = null;
    this.ghostUnit = null;
    this.lastGhostData = null;
    this.view.updateGhostPreview(null);
    this.clearNukeTrajectory();
  }

  private removeGhostStructure() {
    this.clearGhostStructure();
    this.uiState.ghostStructure = null;
  }

  private resolveGhostRangeLevel(
    buildableUnit: BuildableUnit,
  ): number | undefined {
    if (buildableUnit.type !== UnitType.SAMLauncher) return undefined;
    if (buildableUnit.canUpgrade !== false) {
      const existing = this.game.unit(buildableUnit.canUpgrade);
      if (existing) {
        return existing.level() + 1;
      } else {
        console.error("Failed to find existing SAMLauncher for upgrade");
      }
    }
    return 1;
  }

  private hoveredCompletedSourceTile(
    player: NonNullable<ReturnType<GameView["myPlayer"]>>,
    type: UnitType.Runway | UnitType.MilitaryBase,
    hoverTile: TileRef,
  ): TileRef | null {
    const rangeSquared = this.game.config().openBackVehicleSnapRadius() ** 2;
    let best: TileRef | null = null;
    let bestDistance = Infinity;
    for (const unit of player.units(type)) {
      if (!unit.isActive() || unit.isUnderConstruction()) continue;
      const distance = this.game.euclideanDistSquared(unit.tile(), hoverTile);
      if (distance <= rangeSquared && distance < bestDistance) {
        best = unit.tile();
        bestDistance = distance;
      }
    }
    return best;
  }
}
