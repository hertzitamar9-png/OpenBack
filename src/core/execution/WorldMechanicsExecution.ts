import { experienceModeFromConfigView } from "../ExperienceMode";
import { Execution, Game, MessageType, Player, Structures } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { GameUpdateType, WorldEventKind } from "../game/GameUpdates";
import { PseudoRandom } from "../PseudoRandom";
import {
  isFloodableLand,
  isTidalCoast,
  threeDWorldCycle,
  TIDAL_REACH_TILES,
} from "../world/ThreeDWorldCycle";

type ObjectiveReward = "gold" | "troops" | "radar" | "victory";
const DISASTER_MESSAGES = {
  earthquake: "events_display.natural_disaster_earthquake",
  tsunami: "events_display.natural_disaster_tsunami",
  tornado: "events_display.natural_disaster_tornado",
  wildfire: "events_display.natural_disaster_wildfire",
  meteor: "events_display.natural_disaster_meteor",
  drought: "events_display.natural_disaster_drought",
  blizzard: "events_display.natural_disaster_blizzard",
  flood: "events_display.natural_disaster_flood",
  volcano: "events_display.natural_disaster_volcano",
  lightning: "events_display.natural_disaster_lightning",
  sandstorm: "events_display.natural_disaster_sandstorm",
  avalanche: "events_display.natural_disaster_avalanche",
  sinkhole: "events_display.natural_disaster_sinkhole",
  radiation_storm: "events_display.natural_disaster_radiation_storm",
} as const;
type DisasterKind = keyof typeof DISASTER_MESSAGES;
const STRUCTURE_DESTROYING_DISASTERS = new Set<DisasterKind>([
  "earthquake",
  "tsunami",
  "tornado",
  "wildfire",
  "meteor",
  "flood",
  "volcano",
  "lightning",
  "avalanche",
  "sinkhole",
]);
const DISASTER_SEVERITY: Record<DisasterKind, number> = {
  earthquake: 0.08,
  tsunami: 0.11,
  tornado: 0.1,
  wildfire: 0.08,
  meteor: 0.16,
  drought: 0.05,
  blizzard: 0.055,
  flood: 0.075,
  volcano: 0.14,
  lightning: 0.07,
  sandstorm: 0.045,
  avalanche: 0.09,
  sinkhole: 0.12,
  radiation_storm: 0.065,
};

interface PendingDisaster {
  kind: DisasterKind;
  tile: TileRef;
  impactTick: number;
}

interface TerrainChange {
  originalByte: number;
  originalOwnerID: number;
  appliedByte: number;
  expiresTick: number | null;
  source: WorldEventKind;
  recoveryWarned: boolean;
}
interface Objective {
  id: number;
  tile: TileRef;
  reward: ObjectiveReward;
  owner: Player | null;
}
interface DisasterDamageScan {
  centers: Array<{ tile: TileRef; radius: number }>;
  kind: DisasterKind;
  affected: Map<Player, number>;
  y: number;
  maxY: number;
  starts: Int32Array;
  ends: Int32Array;
}

interface TidalTerrainChange {
  originalByte: number;
  originalOwnerID: number;
  appliedByte: number;
}

/** Deterministic optional world systems shared by clients, bots, and replays. */
export class WorldMechanicsExecution implements Execution {
  private game!: Game;
  private objectives: Objective[] = [];
  private random: PseudoRandom;
  private victoryPoints = new Map<string, number>();
  private active = true;
  private nextDisasterTick: number | null = null;
  private disasterBag: DisasterKind[] = [];
  private pendingDisaster: PendingDisaster | null = null;
  private terrainChanges = new Map<TileRef, TerrainChange>();
  private nextSeasonTick: number | null = null;
  private pendingSeasonal: { tile: TileRef; impactTick: number } | null = null;
  private pendingSaturation: { tile: TileRef; impactTick: number } | null =
    null;
  private lastSaturationCount = 0;
  private pendingDamageScans: DisasterDamageScan[] = [];
  private tidalCoast: TileRef[] = [];
  private tidalExpanded = false;
  private tideScanCursor = 0;
  private tideApplyCursor = 0;
  private tidalTerrain = new Map<TileRef, TidalTerrainChange>();

  constructor(seed: number) {
    this.random = new PseudoRandom(seed ^ 0x4f50454e);
  }

  init(game: Game): void {
    this.game = game;
  }

  tick(ticks: number): void {
    if (this.game.inSpawnPhase()) return;
    this.processDisasterDamageScans();
    const mechanics = this.game.config().worldMechanics();
    this.restoreTerrain(ticks);
    if (experienceModeFromConfigView(this.game.config()) === "3d") {
      this.processThreeDTide(ticks);
    } else if (this.tidalTerrain.size > 0) {
      this.restoreThreeDTide();
    }
    if (mechanics.strategicObjectives) {
      if (this.objectives.length === 0) this.createObjectives();
      if (ticks % 100 === 0) this.updateObjectives();
    }
    if (mechanics.naturalDisasters) {
      // Every impact is announced five seconds ahead. The chosen kind, center,
      // and impact tick are stored in simulation state so clients/replays never
      // derive world changes from wall-clock time or rendering performance.
      this.nextDisasterTick ??= ticks + 70;
      if (this.pendingDisaster && ticks >= this.pendingDisaster.impactTick) {
        const pending = this.pendingDisaster;
        this.pendingDisaster = null;
        this.triggerDisaster(pending.kind, pending.tile, ticks);
        this.nextDisasterTick = ticks + this.random.nextInt(220, 351);
      } else if (!this.pendingDisaster && ticks >= this.nextDisasterTick) {
        this.scheduleDisaster(ticks);
      }
    } else {
      this.nextDisasterTick = null;
      this.pendingDisaster = null;
    }
    if (mechanics.livingWorld) {
      this.nextSeasonTick ??= ticks + 260;
      if (this.pendingSeasonal && ticks >= this.pendingSeasonal.impactTick) {
        this.triggerSeasonalShift(ticks, this.pendingSeasonal.tile);
        this.pendingSeasonal = null;
        this.nextSeasonTick = ticks + this.random.nextInt(360, 521);
      } else if (!this.pendingSeasonal && ticks >= this.nextSeasonTick) {
        this.scheduleSeasonalShift(ticks);
      }
      if (
        this.pendingSaturation &&
        ticks >= this.pendingSaturation.impactTick
      ) {
        this.applyNuclearSaturation(this.pendingSaturation.tile, ticks);
        this.pendingSaturation = null;
      }
      if (ticks % 200 === 0) this.checkNuclearSaturation(ticks);
    } else {
      this.nextSeasonTick = null;
      this.pendingSeasonal = null;
      this.pendingSaturation = null;
    }
  }

  private processThreeDTide(ticks: number): void {
    const totalTiles = this.game.width() * this.game.height();
    if (this.tideScanCursor < totalTiles) {
      // Finish before the first night without a single large map-loading scan.
      const scanBudget = Math.max(4096, Math.ceil(totalTiles / 240));
      const end = Math.min(totalTiles, this.tideScanCursor + scanBudget);
      for (let tile = this.tideScanCursor; tile < end; tile++) {
        const ref = tile as TileRef;
        if (
          isTidalCoast(this.game.terrainByte(ref), this.game.isOceanShore(ref))
        ) {
          this.tidalCoast.push(ref);
        }
      }
      this.tideScanCursor = end;
    } else if (!this.tidalExpanded) {
      this.expandTidalReach();
      this.tidalExpanded = true;
    }

    if (threeDWorldCycle(ticks).isNight) {
      const end = Math.min(this.tidalCoast.length, this.tideApplyCursor + 1800);
      for (; this.tideApplyCursor < end; this.tideApplyCursor++) {
        const tile = this.tidalCoast[this.tideApplyCursor];
        // Inland tiles reached by the tide do not touch the ocean, so the
        // shoreline predicate would reject them here.
        if (!isFloodableLand(this.game.terrainByte(tile))) {
          continue;
        }
        const originalByte = this.game.terrainByte(tile);
        const appliedByte = 0x60; // ocean shoreline, magnitude zero
        this.tidalTerrain.set(tile, {
          originalByte,
          originalOwnerID: this.game.ownerID(tile),
          appliedByte,
        });
        this.game.setTerrainByte(tile, appliedByte);
      }
      return;
    }

    if (this.tidalTerrain.size > 0) this.restoreThreeDTide();
    this.tideApplyCursor = 0;
  }

  /**
   * Grow the flooded set inland from the shoreline over low ground.
   *
   * A breadth-first walk across static terrain: no randomness and no game
   * state, so every client and every replay derives the identical tile set
   * from the map alone.
   */
  private expandTidalReach(): void {
    if (TIDAL_REACH_TILES <= 0) return;
    const seen = new Set<TileRef>(this.tidalCoast);
    let frontier = [...this.tidalCoast];
    const scratch: TileRef[] = [
      0 as TileRef,
      0 as TileRef,
      0 as TileRef,
      0 as TileRef,
    ];

    for (
      let ring = 0;
      ring < TIDAL_REACH_TILES && frontier.length > 0;
      ring++
    ) {
      const next: TileRef[] = [];
      for (const tile of frontier) {
        const count = this.game.neighbors4(tile, scratch);
        for (let i = 0; i < count; i++) {
          const neighbor = scratch[i];
          if (seen.has(neighbor)) continue;
          if (!isFloodableLand(this.game.terrainByte(neighbor))) continue;
          seen.add(neighbor);
          this.tidalCoast.push(neighbor);
          next.push(neighbor);
        }
      }
      frontier = next;
    }
  }

  private restoreThreeDTide(): void {
    let restored = 0;
    for (const [tile, change] of this.tidalTerrain) {
      if (restored >= 1800) break;
      if (this.game.terrainByte(tile) === change.appliedByte) {
        this.game.setTerrainByte(tile, change.originalByte);
        if (
          change.originalOwnerID !== 0 &&
          this.game.isLand(tile) &&
          !this.game.hasOwner(tile)
        ) {
          const owner = this.game.playerBySmallID(change.originalOwnerID);
          if (owner.isPlayer() && owner.isAlive()) owner.conquer(tile);
        }
      }
      this.tidalTerrain.delete(tile);
      restored++;
    }
  }

  private scheduleDisaster(ticks: number): void {
    const kind = this.nextDisasterKind();
    const tile = this.pickDisasterTile(kind === "tsunami" || kind === "flood");
    if (tile === null) {
      this.nextDisasterTick = ticks + 30;
      return;
    }
    this.pendingDisaster = { kind, tile, impactTick: ticks + 50 };
    this.game.addUpdate({
      type: GameUpdateType.WorldEvent,
      kind: "disaster_warning",
      warnedKind: kind,
      tile,
      radius: this.baseRadius(kind),
      durationTicks: 50,
    });
    this.game.displayMessage(
      "events_display.natural_disaster_warning",
      MessageType.WORLD_EVENT,
      null,
      undefined,
      { disaster: kind.replace(/_/g, " ") },
    );
  }

  private createObjectives(): void {
    const count = Math.max(
      3,
      Math.min(8, Math.round(this.game.numLandTiles() / 80_000)),
    );
    const candidates: Array<{ tile: TileRef; distance: number }> = [];
    const players = this.game.players().filter((p) => p.hasSpawned());
    const numTiles = this.game.width() * this.game.height();
    const stride = Math.max(1, Math.floor(numTiles / 12_000));
    for (
      let tile = this.random.nextInt(0, stride);
      tile < numTiles;
      tile += stride
    ) {
      if (!this.game.isLand(tile) || this.game.hasOwner(tile)) continue;
      const x = this.game.x(tile);
      const y = this.game.y(tile);
      let nearest = Number.POSITIVE_INFINITY;
      for (const player of players) {
        const spawn = player.spawnTile();
        if (spawn === undefined) continue;
        nearest = Math.min(
          nearest,
          Math.hypot(x - this.game.x(spawn), y - this.game.y(spawn)),
        );
      }
      candidates.push({ tile, distance: nearest });
    }
    candidates.sort((a, b) => b.distance - a.distance || a.tile - b.tile);
    const minSpacing = Math.max(
      25,
      Math.min(this.game.width(), this.game.height()) / 8,
    );
    const rewards: ObjectiveReward[] = ["gold", "troops", "radar", "victory"];
    for (const candidate of candidates) {
      if (this.objectives.length >= count) break;
      if (
        this.objectives.some(
          (o) => this.tileDistance(o.tile, candidate.tile) < minSpacing,
        )
      )
        continue;
      const objective: Objective = {
        id: this.objectives.length + 1,
        tile: candidate.tile,
        reward: rewards[this.objectives.length % rewards.length],
        owner: null,
      };
      this.objectives.push(objective);
      this.emit("objective_spawn", objective.tile, 12, 0, objective);
    }
  }

  private updateObjectives(): void {
    for (const objective of this.objectives) {
      const owner = this.game.owner(objective.tile);
      const player = owner.isPlayer() ? this.game.player(owner.id()) : null;
      if (player !== objective.owner) {
        objective.owner = player;
        this.emit(
          "objective_control",
          objective.tile,
          12,
          20,
          objective,
          player ?? undefined,
        );
      }
      if (!player || !player.isAlive()) continue;
      let amount = 0;
      switch (objective.reward) {
        case "gold":
          amount = 75_000;
          player.addGold(BigInt(amount), objective.tile);
          break;
        case "troops":
          amount = 20_000;
          player.addTroops(amount);
          break;
        case "radar":
          amount = 45; // radius, consumed by the fog renderer
          break;
        case "victory": {
          amount = (this.victoryPoints.get(player.id()) ?? 0) + 1;
          this.victoryPoints.set(player.id(), amount);
          break;
        }
      }
      this.emit(
        "objective_reward",
        objective.tile,
        12,
        20,
        objective,
        player,
        amount,
      );
    }
  }

  private triggerDisaster(
    kind: DisasterKind,
    tile: TileRef,
    ticks: number,
  ): void {
    const radius = this.baseRadius(kind);
    const durationTicks =
      kind === "tornado"
        ? 180
        : kind === "wildfire" || kind === "drought"
          ? 160
          : kind === "tsunami" || kind === "flood"
            ? 120
            : kind === "earthquake"
              ? 100
              : kind === "volcano"
                ? 220
                : kind === "blizzard" || kind === "sandstorm"
                  ? 190
                  : 90;
    // Scope: most disasters are local, but some escalate to a continent-wide or
    // world-wide event so entire regions (or the whole map) get hit at once.
    const roll = this.random.nextInt(0, 100);
    const scope: "local" | "continent" | "world" =
      roll < 6 ? "world" : roll < 20 ? "continent" : "local";
    let scopeRadius = radius;
    if (scope === "continent") {
      scopeRadius = Math.round(
        Math.min(this.game.width(), this.game.height()) * 0.18,
      );
    } else if (scope === "world") {
      scopeRadius = Math.round(
        Math.max(this.game.width(), this.game.height()) * 0.55,
      );
    }
    let pathEnd: TileRef | undefined;
    if (
      kind === "tornado" ||
      kind === "wildfire" ||
      kind === "sandstorm" ||
      kind === "avalanche"
    ) {
      const x = Math.max(
        0,
        Math.min(
          this.game.width() - 1,
          this.game.x(tile) + this.random.nextInt(-110, 111),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          this.game.height() - 1,
          this.game.y(tile) + this.random.nextInt(-110, 111),
        ),
      );
      pathEnd = this.game.ref(x, y);
    } else if (kind === "tsunami" || kind === "flood") {
      // Drive the wave inland toward the map center so it reads as a moving
      // wall of water instead of a generic circular pulse.
      const sx = this.game.x(tile);
      const sy = this.game.y(tile);
      const dx = this.game.width() / 2 - sx;
      const dy = this.game.height() / 2 - sy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const x = Math.round(
        Math.max(0, Math.min(this.game.width() - 1, sx + (dx / len) * 75)),
      );
      const y = Math.round(
        Math.max(0, Math.min(this.game.height() - 1, sy + (dy / len) * 75)),
      );
      pathEnd = this.game.ref(x, y);
    }

    const impactCenters: Array<{ tile: TileRef; radius: number }> = [
      { tile, radius: scopeRadius },
    ];
    if (pathEnd !== undefined) {
      const steps =
        kind === "tornado" ? 6 : kind === "tsunami" || kind === "flood" ? 4 : 3;
      for (let i = 1; i <= steps; i++) {
        impactCenters.push({
          tile: this.interpolateTile(tile, pathEnd, i / steps),
          radius,
        });
      }
    } else if (
      kind === "earthquake" ||
      kind === "wildfire" ||
      kind === "lightning"
    ) {
      const patches = kind === "wildfire" ? 5 : kind === "lightning" ? 6 : 3;
      for (let i = 1; i < patches; i++) {
        const patch = this.offsetLandTile(tile, Math.round(radius * 1.25));
        if (patch !== null) {
          impactCenters.push({
            tile: patch,
            radius: Math.round(radius * 0.65),
          });
        }
      }
    }

    // Continent/world disasters hit several regions at once so the whole map
    // (or a large area) is affected, not just one spot.
    if (scope === "continent" || scope === "world") {
      const extra = scope === "world" ? 8 : 2;
      for (let i = 0; i < extra; i++) {
        const t = this.pickDisasterTile(kind === "tsunami");
        if (t !== null) {
          impactCenters.push({
            tile: t,
            radius: scopeRadius,
          });
        }
      }
    }

    // Earthquakes and wildfires have several simultaneous visible epicenters.
    // Moving disasters use one animated path but damage each sampled segment.
    const visualCenters =
      kind === "earthquake" || kind === "wildfire" || kind === "lightning"
        ? impactCenters.slice(0, 4)
        : impactCenters.slice(0, 1);
    for (const center of visualCenters) {
      this.game.addUpdate({
        type: GameUpdateType.WorldEvent,
        kind,
        tile: center.tile,
        // Damage keeps the full configured scope, while the animation stays
        // local enough to remain detailed and avoid full-map translucent quads.
        radius: Math.min(center.radius, Math.round(radius * 1.5)),
        durationTicks,
        pathEnd:
          center.tile === tile &&
          (kind === "tornado" ||
            kind === "tsunami" ||
            kind === "flood" ||
            kind === "wildfire" ||
            kind === "sandstorm" ||
            kind === "avalanche")
            ? pathEnd
            : undefined,
      });
    }
    this.game.displayMessage(
      DISASTER_MESSAGES[kind as keyof typeof DISASTER_MESSAGES],
      MessageType.WORLD_EVENT,
      null,
    );
    this.applyDisasterDamage(impactCenters, kind);
    if (kind === "radiation_storm") {
      this.seedRadiation(impactCenters);
    }
    if (this.game.config().worldMechanics().livingWorld) {
      this.applyLivingWorldImpact(kind, impactCenters, ticks);
    }
  }

  private baseRadius(kind: DisasterKind): number {
    switch (kind) {
      case "meteor":
        return 20;
      case "lightning":
        return 14;
      case "sinkhole":
        return 18;
      case "tornado":
        return 22;
      case "tsunami":
        return 36;
      case "drought":
        return 48;
      case "blizzard":
      case "sandstorm":
        return 44;
      case "flood":
        return 38;
      case "volcano":
        return 30;
      case "avalanche":
        return 26;
      case "radiation_storm":
        return 40;
      default:
        return 30;
    }
  }

  private nextDisasterKind(): DisasterKind {
    if (this.disasterBag.length === 0) {
      this.disasterBag = [
        "earthquake",
        "tsunami",
        "tornado",
        "wildfire",
        "meteor",
        "drought",
        "blizzard",
        "flood",
        "volcano",
        "lightning",
        "sandstorm",
        "avalanche",
        "sinkhole",
        "radiation_storm",
      ];
      for (let i = this.disasterBag.length - 1; i > 0; i--) {
        const j = this.random.nextInt(0, i + 1);
        [this.disasterBag[i], this.disasterBag[j]] = [
          this.disasterBag[j],
          this.disasterBag[i],
        ];
      }
    }
    return this.disasterBag.pop()!;
  }

  private pickDisasterTile(shore: boolean): TileRef | null {
    const alive = this.game
      .players()
      .filter((player) => player.isAlive() && player.numTilesOwned() > 0);
    // Target any alive player (human, bot, or nation) uniformly so disasters
    // don't cluster on the lone human in a bot-filled lobby.
    const pool = alive;
    if (pool.length > 0) {
      const start = this.random.nextInt(0, pool.length);
      for (let offset = 0; offset < pool.length; offset++) {
        const player = pool[(start + offset) % pool.length];
        let selected: TileRef | null = null;
        let seen = 0;
        for (const owned of player.tiles()) {
          if (shore && !this.game.isOceanShore(owned)) continue;
          seen++;
          if (this.random.nextInt(0, seen) === 0) selected = owned;
        }
        if (selected !== null) return selected;
      }
    }

    for (let i = 0; i < 4_000; i++) {
      const tile = this.random.nextInt(
        0,
        this.game.width() * this.game.height(),
      );
      if (!this.game.isLand(tile)) continue;
      if (shore && !this.game.isOceanShore(tile)) continue;
      return tile;
    }
    // Landlocked maps still get the full event rotation. Here a tsunami is
    // presented as an inland flash-flood surge instead of being discarded.
    if (shore) return this.pickDisasterTile(false);
    return null;
  }

  private scheduleSeasonalShift(ticks: number): void {
    const tile = this.pickNarrowWaterTile();
    if (tile === null) {
      this.nextSeasonTick = ticks + 60;
      return;
    }
    this.pendingSeasonal = { tile, impactTick: ticks + 50 };
    this.game.addUpdate({
      type: GameUpdateType.WorldEvent,
      kind: "disaster_warning",
      warnedKind: "winter_freeze",
      tile,
      radius: Math.max(24, Math.min(52, Math.round(this.game.width() / 30))),
      durationTicks: 50,
    });
    this.game.displayMessage(
      "events_display.living_world_winter_warning",
      MessageType.WORLD_EVENT,
      null,
    );
  }

  private triggerSeasonalShift(ticks: number, center: TileRef): void {
    if (center === null) return;
    const radius = Math.max(
      24,
      Math.min(52, Math.round(this.game.width() / 30)),
    );
    const changed = this.mutateTerrainCircle(
      center,
      radius,
      (tile) => {
        if (!this.game.isWater(tile)) return false;
        let landNeighbors = 0;
        this.game.forEachNeighbor(tile, (neighbor) => {
          if (this.game.isLand(neighbor) && !this.game.isImpassable(neighbor))
            landNeighbors++;
        });
        return landNeighbors >= 2 || this.game.magnitude(tile) <= 2;
      },
      () => 0x81,
      ticks + 300,
      "winter_freeze",
      900,
    );
    if (changed === 0) return;
    this.game.addUpdate({
      type: GameUpdateType.WorldEvent,
      kind: "winter_freeze",
      tile: center,
      radius,
      durationTicks: 180,
    });
    this.game.displayMessage(
      "events_display.living_world_winter",
      MessageType.WORLD_EVENT,
      null,
    );
  }

  private pickNarrowWaterTile(): TileRef | null {
    const total = this.game.width() * this.game.height();
    const stride = Math.max(1, Math.floor(total / 20_000));
    const start = this.random.nextInt(0, stride);
    let selected: TileRef | null = null;
    let seen = 0;
    for (let tile = start; tile < total; tile += stride) {
      if (!this.game.isWater(tile)) continue;
      let landNeighbors = 0;
      this.game.forEachNeighbor(tile, (neighbor) => {
        if (this.game.isLand(neighbor) && !this.game.isImpassable(neighbor))
          landNeighbors++;
      });
      if (landNeighbors < 2 && this.game.magnitude(tile) > 2) continue;
      seen++;
      if (this.random.nextInt(0, seen) === 0) selected = tile;
    }
    return selected;
  }

  private applyLivingWorldImpact(
    kind: DisasterKind,
    centers: Array<{ tile: TileRef; radius: number }>,
    ticks: number,
  ): void {
    for (const center of centers.slice(0, 4)) {
      if (kind === "drought") {
        this.mutateTerrainCircle(
          center.tile,
          Math.min(center.radius, 55),
          (tile) => this.game.isWater(tile) && !this.game.isOcean(tile),
          () => 0x81,
          ticks + 360,
          kind,
          1_200,
        );
      } else if (kind === "flood" || kind === "tsunami") {
        this.mutateTerrainCircle(
          center.tile,
          Math.min(center.radius, 42),
          (tile) =>
            this.game.isLand(tile) &&
            !this.game.isImpassable(tile) &&
            this.game.magnitude(tile) <= 3,
          () => 0,
          ticks + (kind === "flood" ? 260 : 140),
          kind,
          900,
        );
      } else if (kind === "volcano") {
        this.mutateTerrainCircle(
          center.tile,
          Math.min(18, center.radius),
          (tile) => this.game.isLand(tile) && !this.game.isImpassable(tile),
          (tile) => {
            const d = this.tileDistance(tile, center.tile);
            return d < 6 ||
              Math.round(
                d + this.game.x(tile) * 0.31 + this.game.y(tile) * 0.17,
              ) %
                4 ===
                0
              ? 0x9f
              : this.game.terrainByte(tile);
          },
          null,
          kind,
          420,
        );
      } else if (kind === "sinkhole") {
        this.mutateTerrainCircle(
          center.tile,
          8,
          (tile) => this.game.isLand(tile) && !this.game.isImpassable(tile),
          () => 0x9f,
          null,
          kind,
          180,
        );
      }
    }
  }

  private mutateTerrainCircle(
    center: TileRef,
    radius: number,
    eligible: (tile: TileRef) => boolean,
    nextByte: (tile: TileRef) => number,
    expiresTick: number | null,
    source: WorldEventKind,
    limit: number,
  ): number {
    const cx = this.game.x(center);
    const cy = this.game.y(center);
    const r2 = radius * radius;
    let changed = 0;
    for (
      let y = Math.max(0, cy - radius);
      y <= Math.min(this.game.height() - 1, cy + radius);
      y++
    ) {
      const dy = y - cy;
      const half = Math.floor(Math.sqrt(Math.max(0, r2 - dy * dy)));
      for (
        let x = Math.max(0, cx - half);
        x <= Math.min(this.game.width() - 1, cx + half);
        x++
      ) {
        if (changed >= limit) return changed;
        const tile = this.game.ref(x, y);
        if (!eligible(tile)) continue;
        const oldByte = this.game.terrainByte(tile);
        const appliedByte = nextByte(tile);
        if (oldByte === appliedByte) continue;
        const previous = this.terrainChanges.get(tile);
        this.terrainChanges.set(tile, {
          originalByte: previous?.originalByte ?? oldByte,
          originalOwnerID: previous?.originalOwnerID ?? this.game.ownerID(tile),
          appliedByte,
          expiresTick,
          source,
          recoveryWarned: previous?.recoveryWarned ?? false,
        });
        this.game.setTerrainByte(tile, appliedByte);
        changed++;
      }
    }
    return changed;
  }

  private restoreTerrain(ticks: number): void {
    let thawCenter: TileRef | null = null;
    let thawCount = 0;
    let recoveryWarningCenter: TileRef | null = null;
    for (const [tile, change] of this.terrainChanges) {
      if (
        change.expiresTick !== null &&
        !change.recoveryWarned &&
        ticks >= change.expiresTick - 50
      ) {
        change.recoveryWarned = true;
        recoveryWarningCenter ??= tile;
      }
      if (change.expiresTick === null || ticks < change.expiresTick) continue;
      if (this.game.terrainByte(tile) === change.appliedByte) {
        this.game.setTerrainByte(tile, change.originalByte);
        // Temporary floods do not permanently erase the nation that held the
        // ground before the water arrived. If that nation still exists and the
        // restored tile is usable land, return it deterministically. Drought
        // land and frozen crossings have no previous owner and remain neutral.
        if (
          change.originalOwnerID !== 0 &&
          this.game.isLand(tile) &&
          !this.game.isImpassable(tile) &&
          !this.game.hasOwner(tile)
        ) {
          const previousOwner = this.game.playerBySmallID(
            change.originalOwnerID,
          );
          if (previousOwner.isPlayer() && previousOwner.isAlive()) {
            previousOwner.conquer(tile);
          }
        }
        if (change.source === "winter_freeze") {
          thawCenter ??= tile;
          thawCount++;
        }
      }
      this.terrainChanges.delete(tile);
    }
    if (recoveryWarningCenter !== null) {
      this.game.addUpdate({
        type: GameUpdateType.WorldEvent,
        kind: "disaster_warning",
        warnedKind: "spring_thaw",
        tile: recoveryWarningCenter,
        radius: 32,
        durationTicks: 50,
      });
      this.game.displayMessage(
        "events_display.living_world_recovery_warning",
        MessageType.WORLD_EVENT,
        null,
      );
    }
    if (thawCenter !== null && thawCount > 0) {
      this.game.addUpdate({
        type: GameUpdateType.WorldEvent,
        kind: "spring_thaw",
        tile: thawCenter,
        radius: Math.min(50, Math.max(14, Math.round(Math.sqrt(thawCount)))),
        durationTicks: 100,
      });
      this.game.displayMessage(
        "events_display.living_world_thaw",
        MessageType.WORLD_EVENT,
        null,
      );
    }
  }

  private checkNuclearSaturation(ticks: number): void {
    if (this.pendingSaturation) return;
    const count = this.game.numTilesWithFallout();
    const threshold = Math.max(
      80,
      Math.round(this.game.numLandTiles() * 0.00008),
    );
    if (count < this.lastSaturationCount + threshold) return;
    let center: TileRef | null = null;
    let seen = 0;
    const total = this.game.width() * this.game.height();
    for (let tile = 0; tile < total; tile++) {
      if (!this.game.hasFallout(tile)) continue;
      seen++;
      if (this.random.nextInt(0, seen) === 0) center = tile;
    }
    if (center === null) return;
    this.lastSaturationCount = count;
    this.pendingSaturation = { tile: center, impactTick: ticks + 50 };
    this.game.addUpdate({
      type: GameUpdateType.WorldEvent,
      kind: "disaster_warning",
      warnedKind: "nuclear_saturation",
      tile: center,
      radius: 16,
      durationTicks: 50,
    });
    this.game.displayMessage(
      "events_display.living_world_nuclear_warning",
      MessageType.WORLD_EVENT,
      null,
    );
  }

  private applyNuclearSaturation(center: TileRef, ticks: number): void {
    const radius = 16;
    this.mutateTerrainCircle(
      center,
      radius,
      (tile) =>
        !this.game.hasOwner(tile) &&
        this.game.isLand(tile) &&
        !this.game.isImpassable(tile),
      (tile) =>
        (this.game.x(tile) + this.game.y(tile) + ticks) % 3 === 0
          ? 0x9f
          : this.game.terrainByte(tile),
      null,
      "nuclear_saturation",
      260,
    );
    this.game.addUpdate({
      type: GameUpdateType.WorldEvent,
      kind: "nuclear_saturation",
      tile: center,
      radius,
      durationTicks: 180,
    });
    this.game.displayMessage(
      "events_display.living_world_nuclear_saturation",
      MessageType.WORLD_EVENT,
      null,
    );
  }

  private interpolateTile(from: TileRef, to: TileRef, t: number): TileRef {
    const x = Math.round(
      this.game.x(from) + (this.game.x(to) - this.game.x(from)) * t,
    );
    const y = Math.round(
      this.game.y(from) + (this.game.y(to) - this.game.y(from)) * t,
    );
    return this.game.ref(
      Math.max(0, Math.min(this.game.width() - 1, x)),
      Math.max(0, Math.min(this.game.height() - 1, y)),
    );
  }

  private offsetLandTile(origin: TileRef, distance: number): TileRef | null {
    for (let i = 0; i < 24; i++) {
      const x = Math.max(
        0,
        Math.min(
          this.game.width() - 1,
          this.game.x(origin) + this.random.nextInt(-distance, distance + 1),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          this.game.height() - 1,
          this.game.y(origin) + this.random.nextInt(-distance, distance + 1),
        ),
      );
      const tile = this.game.ref(x, y);
      if (this.game.isLand(tile)) return tile;
    }
    return null;
  }

  private applyDisasterDamage(
    centers: Array<{ tile: TileRef; radius: number }>,
    kind: DisasterKind,
  ): void {
    const affected = new Map<Player, number>();
    const unitDamage =
      kind === "meteor" || kind === "volcano" || kind === "sinkhole"
        ? 1
        : kind === "lightning" || kind === "avalanche"
          ? 0.6
          : kind === "blizzard" || kind === "sandstorm"
            ? 0.18
            : 0.35;
    for (const unit of this.game.units()) {
      if (
        !unit.isActive() ||
        !centers.some(
          (center) =>
            this.tileDistance(unit.tile(), center.tile) <= center.radius,
        )
      )
        continue;
      if (
        Structures.has(unit.type()) &&
        STRUCTURE_DESTROYING_DISASTERS.has(kind)
      ) {
        unit.delete();
      } else if (unit.hasHealth()) {
        unit.modifyHealth(
          -Math.max(1, Math.round(unit.maxHealth() * unitDamage)),
        );
      } else if (unit.troops() > 0) {
        unit.setTroops(Math.floor(unit.troops() * (1 - unitDamage)));
      }
      affected.set(unit.owner(), (affected.get(unit.owner()) ?? 0) + 1);
    }

    // Queue the territory scan and consume it under a deterministic per-tick
    // work budget. A world-scale event can cover millions of cells; doing all
    // of that in its impact tick froze both server and clients. Spreading the
    // same exact calculation across the visible event animation preserves the
    // result while keeping turns responsive.
    let minY = this.game.height() - 1;
    let maxY = 0;
    for (const center of centers) {
      const cy = this.game.y(center.tile);
      minY = Math.min(minY, Math.max(0, cy - center.radius));
      maxY = Math.max(
        maxY,
        Math.min(this.game.height() - 1, cy + center.radius),
      );
    }
    this.pendingDamageScans.push({
      centers,
      kind,
      affected,
      y: minY,
      maxY,
      starts: new Int32Array(centers.length),
      ends: new Int32Array(centers.length),
    });
    this.processDisasterDamageScans();
  }

  private processDisasterDamageScans(tileBudget = 60_000): void {
    let visited = 0;
    while (this.pendingDamageScans.length > 0 && visited < tileBudget) {
      const scan = this.pendingDamageScans[0];
      if (scan.y > scan.maxY) {
        this.finishDisasterDamageScan(scan);
        this.pendingDamageScans.shift();
        continue;
      }
      const y = scan.y++;
      let intervalCount = 0;
      for (const center of scan.centers) {
        const cx = this.game.x(center.tile);
        const dy = y - this.game.y(center.tile);
        const radiusSquared = center.radius * center.radius;
        if (dy * dy > radiusSquared) continue;
        const halfWidth = Math.floor(Math.sqrt(radiusSquared - dy * dy));
        const start = Math.max(0, cx - halfWidth);
        const end = Math.min(this.game.width() - 1, cx + halfWidth);
        let insertAt = intervalCount;
        while (insertAt > 0 && scan.starts[insertAt - 1] > start) {
          scan.starts[insertAt] = scan.starts[insertAt - 1];
          scan.ends[insertAt] = scan.ends[insertAt - 1];
          insertAt--;
        }
        scan.starts[insertAt] = start;
        scan.ends[insertAt] = end;
        intervalCount++;
      }
      if (intervalCount === 0) continue;
      let mergedStart = scan.starts[0];
      let mergedEnd = scan.ends[0];
      for (let i = 1; i <= intervalCount; i++) {
        if (i < intervalCount && scan.starts[i] <= mergedEnd + 1) {
          mergedEnd = Math.max(mergedEnd, scan.ends[i]);
          continue;
        }
        visited += mergedEnd - mergedStart + 1;
        for (let x = mergedStart; x <= mergedEnd; x++) {
          const tile = this.game.ref(x, y);
          if (!this.game.hasOwner(tile)) continue;
          const owner = this.game.owner(tile);
          if (!owner.isPlayer()) continue;
          const player = this.game.player(owner.id());
          scan.affected.set(player, (scan.affected.get(player) ?? 0) + 1);
        }
        if (i < intervalCount) {
          mergedStart = scan.starts[i];
          mergedEnd = scan.ends[i];
        }
      }
    }
  }

  private finishDisasterDamageScan(scan: DisasterDamageScan): void {
    for (const [player, tiles] of scan.affected) {
      const share = Math.min(1, tiles / Math.max(1, player.numTilesOwned()));
      player.removeTroops(
        Math.floor(
          player.troops() *
            Math.max(0.01, share * DISASTER_SEVERITY[scan.kind]),
        ),
      );
    }
  }

  private seedRadiation(
    centers: Array<{ tile: TileRef; radius: number }>,
  ): void {
    let seeded = 0;
    for (const center of centers.slice(0, 3)) {
      const cx = this.game.x(center.tile);
      const cy = this.game.y(center.tile);
      const radius = Math.min(center.radius, 38);
      const r2 = radius * radius;
      for (
        let y = Math.max(0, cy - radius);
        y <= Math.min(this.game.height() - 1, cy + radius);
        y++
      ) {
        for (
          let x = Math.max(0, cx - radius);
          x <= Math.min(this.game.width() - 1, cx + radius);
          x++
        ) {
          if (seeded >= 360) return;
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy > r2) continue;
          const tile = this.game.ref(x, y);
          if (
            !this.game.isLand(tile) ||
            this.game.isImpassable(tile) ||
            this.game.hasOwner(tile) ||
            this.game.hasFallout(tile)
          )
            continue;
          if ((x * 17 + y * 31 + center.tile) % 5 !== 0) continue;
          this.game.setFallout(tile, true);
          seeded++;
        }
      }
    }
  }

  private emit(
    kind: WorldEventKind,
    tile: TileRef,
    radius: number,
    durationTicks: number,
    objective: Objective,
    owner?: Player,
    amount?: number,
  ): void {
    this.game.addUpdate({
      type: GameUpdateType.WorldEvent,
      kind,
      tile,
      radius,
      durationTicks,
      objectiveId: objective.id,
      objectiveReward: objective.reward,
      ownerID: owner?.id(),
      amount,
    });
  }

  private tileDistance(a: TileRef, b: TileRef): number {
    return Math.hypot(
      this.game.x(a) - this.game.x(b),
      this.game.y(a) - this.game.y(b),
    );
  }

  isActive(): boolean {
    return this.active;
  }
  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
