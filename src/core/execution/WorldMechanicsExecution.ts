import { Execution, Game, MessageType, Player, Structures } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { GameUpdateType, WorldEventKind } from "../game/GameUpdates";
import { PseudoRandom } from "../PseudoRandom";

type ObjectiveReward = "gold" | "troops" | "radar" | "victory";
const DISASTER_MESSAGES = {
  earthquake: "events_display.natural_disaster_earthquake",
  tsunami: "events_display.natural_disaster_tsunami",
  tornado: "events_display.natural_disaster_tornado",
  wildfire: "events_display.natural_disaster_wildfire",
  meteor: "events_display.natural_disaster_meteor",
  drought: "events_display.natural_disaster_drought",
} as const;
interface Objective {
  id: number;
  tile: TileRef;
  reward: ObjectiveReward;
  owner: Player | null;
}

/** Deterministic optional world systems shared by clients, bots, and replays. */
export class WorldMechanicsExecution implements Execution {
  private game!: Game;
  private objectives: Objective[] = [];
  private random: PseudoRandom;
  private victoryPoints = new Map<string, number>();
  private active = true;
  private nextDisasterTick: number | null = null;
  private disasterBag: WorldEventKind[] = [];

  constructor(seed: number) {
    this.random = new PseudoRandom(seed ^ 0x4f50454e);
  }

  init(game: Game): void {
    this.game = game;
  }

  tick(ticks: number): void {
    if (this.game.inSpawnPhase()) return;
    const mechanics = this.game.config().worldMechanics();
    if (mechanics.strategicObjectives) {
      if (this.objectives.length === 0) this.createObjectives();
      if (ticks % 100 === 0) this.updateObjectives();
    }
    if (mechanics.naturalDisasters) {
      // The former absolute 1200-tick schedule could make the first event take
      // nearly two minutes after spawning. Schedule relative to the real start
      // of play, then keep a deterministic but varied 22-35 second cadence.
      this.nextDisasterTick ??= ticks + 120;
      if (ticks >= this.nextDisasterTick) {
        this.triggerDisaster();
        this.nextDisasterTick = ticks + this.random.nextInt(220, 351);
      }
    } else {
      this.nextDisasterTick = null;
    }
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

  private triggerDisaster(): void {
    const kind = this.nextDisasterKind();
    const tile = this.pickDisasterTile(kind === "tsunami");
    if (tile === null) return;
    const radius =
      kind === "meteor"
        ? 20
        : kind === "drought"
          ? 48
          : kind === "tornado"
            ? 22
            : kind === "tsunami"
              ? 36
              : 30;
    const durationTicks =
      kind === "tornado"
        ? 180
        : kind === "wildfire" || kind === "drought"
          ? 160
          : kind === "tsunami"
            ? 120
            : kind === "earthquake"
              ? 100
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
    if (kind === "tornado" || kind === "wildfire") {
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
    } else if (kind === "tsunami") {
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
      const steps = kind === "tornado" ? 6 : kind === "tsunami" ? 4 : 3;
      for (let i = 1; i <= steps; i++) {
        impactCenters.push({
          tile: this.interpolateTile(tile, pathEnd, i / steps),
          radius,
        });
      }
    } else if (kind === "earthquake" || kind === "wildfire") {
      const patches = kind === "wildfire" ? 5 : 3;
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
      kind === "earthquake" || kind === "wildfire"
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
          (kind === "tornado" || kind === "tsunami" || kind === "wildfire")
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
  }

  private nextDisasterKind(): WorldEventKind {
    if (this.disasterBag.length === 0) {
      this.disasterBag = [
        "earthquake",
        "tsunami",
        "tornado",
        "wildfire",
        "meteor",
        "drought",
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
    kind: WorldEventKind,
  ): void {
    const affected = new Map<Player, number>();
    for (const unit of this.game.units()) {
      if (
        !unit.isActive() ||
        !centers.some(
          (center) =>
            this.tileDistance(unit.tile(), center.tile) <= center.radius,
        )
      )
        continue;
      if (Structures.has(unit.type()) && kind !== "drought") unit.delete();
      affected.set(unit.owner(), (affected.get(unit.owner()) ?? 0) + 1);
    }

    // Scan only the affected circles. The old implementation walked every
    // tile owned by every player, causing a large one-frame hitch on World.
    const affectedTiles = new Set<TileRef>();
    for (const center of centers) {
      const cx = this.game.x(center.tile);
      const cy = this.game.y(center.tile);
      const r = center.radius;
      for (
        let y = Math.max(0, cy - r);
        y <= Math.min(this.game.height() - 1, cy + r);
        y++
      ) {
        for (
          let x = Math.max(0, cx - r);
          x <= Math.min(this.game.width() - 1, cx + r);
          x++
        ) {
          if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
          const tile = this.game.ref(x, y);
          if (!affectedTiles.add(tile) || !this.game.hasOwner(tile)) continue;
          const owner = this.game.owner(tile);
          if (!owner.isPlayer()) continue;
          const player = this.game.player(owner.id());
          affected.set(player, (affected.get(player) ?? 0) + 1);
        }
      }
    }
    const severity =
      kind === "meteor"
        ? 0.16
        : kind === "drought"
          ? 0.05
          : kind === "tornado"
            ? 0.1
            : 0.08;
    for (const [player, tiles] of affected) {
      const share = Math.min(1, tiles / Math.max(1, player.numTilesOwned()));
      player.removeTroops(
        Math.floor(player.troops() * Math.max(0.01, share * severity)),
      );
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
