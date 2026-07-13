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
    if (mechanics.naturalDisasters && ticks >= 600 && ticks % 1200 === 0) {
      this.triggerDisaster();
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
    const kinds: WorldEventKind[] = [
      "earthquake",
      "tsunami",
      "tornado",
      "wildfire",
      "meteor",
      "drought",
    ];
    const kind = kinds[this.random.nextInt(0, kinds.length)];
    const tile = this.pickDisasterTile(kind === "tsunami");
    if (tile === null) return;
    const radius = kind === "meteor" ? 18 : kind === "drought" ? 45 : 30;
    let pathEnd: TileRef | undefined;
    if (kind === "tornado") {
      const x = Math.max(
        0,
        Math.min(
          this.game.width() - 1,
          this.game.x(tile) + this.random.nextInt(-80, 81),
        ),
      );
      const y = Math.max(
        0,
        Math.min(
          this.game.height() - 1,
          this.game.y(tile) + this.random.nextInt(-80, 81),
        ),
      );
      pathEnd = this.game.ref(x, y);
    }
    this.game.addUpdate({
      type: GameUpdateType.WorldEvent,
      kind,
      tile,
      radius,
      durationTicks: kind === "tornado" ? 100 : 50,
      pathEnd,
    });
    this.game.displayMessage(
      DISASTER_MESSAGES[kind as keyof typeof DISASTER_MESSAGES],
      MessageType.WORLD_EVENT,
      null,
    );
    this.applyDisasterDamage(tile, radius, kind);
  }

  private pickDisasterTile(shore: boolean): TileRef | null {
    for (let i = 0; i < 2_000; i++) {
      const tile = this.random.nextInt(
        0,
        this.game.width() * this.game.height(),
      );
      if (!this.game.isLand(tile)) continue;
      if (shore && !this.game.isOceanShore(tile)) continue;
      return tile;
    }
    return null;
  }

  private applyDisasterDamage(
    tile: TileRef,
    radius: number,
    kind: WorldEventKind,
  ): void {
    const affected = new Map<Player, number>();
    for (const unit of this.game.units()) {
      if (!unit.isActive() || this.tileDistance(unit.tile(), tile) > radius)
        continue;
      if (Structures.has(unit.type()) && kind !== "drought") unit.delete();
      affected.set(unit.owner(), (affected.get(unit.owner()) ?? 0) + 1);
    }
    const severity =
      kind === "meteor" ? 0.12 : kind === "drought" ? 0.04 : 0.07;
    for (const player of this.game.players()) {
      let tiles = 0;
      for (const owned of player.tiles()) {
        if (this.tileDistance(owned, tile) <= radius) tiles++;
      }
      if (tiles === 0 && !affected.has(player)) continue;
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
