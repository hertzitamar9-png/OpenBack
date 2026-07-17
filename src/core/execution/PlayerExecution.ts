import { Config } from "../configuration/Config";
import {
  Cell,
  Execution,
  Game,
  MessageType,
  Player,
  Structures,
  UnitType,
} from "../game/Game";
import { GameMap, TileRef } from "../game/GameMap";
import { calculateBoundingBox, getMode, inscribed, simpleHash } from "../Util";
import { hasPlaneBeachhead, isPlaneBeachhead } from "./AnnexationExemptions";

interface ClusterTraversalState {
  visited: Uint16Array;
  gen: number;
}

// Per-game traversal state used by calculateClusters() to avoid per-player buffers.
const traversalStates = new WeakMap<Game, ClusterTraversalState>();

export class PlayerExecution implements Execution {
  private readonly ticksPerClusterCalc = 20;

  private config: Config;
  private lastCalc = 0;
  private mg: Game;
  // Direct GameMap reference to skip the Game delegation hop in hot loops.
  private map: GameMap;
  private mapState: Uint16Array;
  private mapTerrain: Uint8Array;
  private active = true;
  // Reusable neighbor buffer to avoid closures/allocation in cluster checks.
  private nbuf: TileRef[] = [0, 0, 0, 0];
  private diagNbuf: TileRef[] = [0, 0, 0, 0, 0, 0, 0, 0];
  private encirclements = new Map<
    number,
    { since: number; lastSeen: number }
  >();
  private warExhaustionTicks = 0;
  private lastExhaustionBand = 0;
  private lastStructureOwnershipCheck = -1;
  private lastStructureCount = -1;

  constructor(private player: Player) {}

  activeDuringSpawnPhase(): boolean {
    return false;
  }

  init(mg: Game, ticks: number) {
    this.mg = mg;
    this.map = mg.map();
    this.mapState = this.map.tileStateBuffer();
    this.mapTerrain = this.map.terrainBuffer();
    this.config = mg.config();
    this.lastCalc =
      ticks + (simpleHash(this.player.id()) % this.ticksPerClusterCalc);
  }

  tick(ticks: number) {
    this.player.decayRelations();
    const units = this.player.units();
    if (
      this.lastStructureOwnershipCheck !== this.player.lastTileChange() ||
      this.lastStructureCount !== units.length
    ) {
      for (const u of units) {
        const isReadyVehicle =
          (u.type() === UnitType.Plane || u.type() === UnitType.Tank) &&
          u.isLoaded() === true;
        if (!Structures.has(u.type()) && !isReadyVehicle) {
          continue;
        }

        const owner = this.mg.owner(u.tile());
        if (!owner.isPlayer()) {
          u.delete();
          continue;
        }
        if (owner === this.player) {
          continue;
        }

        const captor = this.mg.player(owner.id());
        if (u.type() === UnitType.DefensePost) {
          u.delete(true, captor);
        } else {
          captor.captureUnit(u);
        }
      }

      // A parked tank is physically based at the military base on its tile.
      // Launched tanks (loaded=false) remain independent until their mission
      // ends, but a ready tank cannot survive losing or destroying its base.
      const activeBaseTiles = new Set(
        this.player
          .units(UnitType.MilitaryBase)
          .filter((base) => base.isActive() && !base.isUnderConstruction())
          .map((base) => base.tile()),
      );
      for (const tank of this.player.units(UnitType.Tank)) {
        if (
          tank.isActive() &&
          tank.isLoaded() === true &&
          !activeBaseTiles.has(tank.tile())
        ) {
          tank.delete(false);
        }
      }
      this.lastStructureOwnershipCheck = this.player.lastTileChange();
      this.lastStructureCount = this.player.units().length;
    }

    if (!this.player.isAlive()) {
      this.removeOnDeath();
      this.active = false;
      this.mg.stats().playerKilled(this.player, ticks);
      return;
    }

    const exhaustion = this.updateWarExhaustion();
    const troopInc = this.config.troopIncreaseRate(this.player) * exhaustion;
    this.player.addTroops(troopInc);
    const goldFromWorkers = BigInt(
      Math.floor(
        Number(this.config.goldAdditionRate(this.player)) * exhaustion,
      ),
    );
    this.player.addGold(goldFromWorkers);

    // Record stats
    this.mg.stats().goldWork(this.player, goldFromWorkers);

    for (const alliance of this.player.alliances()) {
      if (alliance.expiresAt() <= this.mg.ticks()) {
        alliance.expire();
      }
    }

    for (const embargo of this.player.getEmbargoes()) {
      if (
        embargo.isTemporary &&
        this.mg.ticks() - embargo.createdAt >
          this.mg.config().temporaryEmbargoDuration()
      ) {
        this.player.stopEmbargo(embargo.target);
      }
    }

    if (
      ticks - this.lastCalc > this.ticksPerClusterCalc ||
      this.player.numTilesOwned() < 100
    ) {
      if (
        this.player.lastTileChange() >= this.lastCalc ||
        this.encirclements.size > 0
      ) {
        this.lastCalc = ticks;
        const start = performance.now();
        this.removeClusters();
        const end = performance.now();
        if (end - start > 1000) {
          console.log(`player ${this.player.name()}, took ${end - start}ms`);
        }
      }
    }
  }

  private removeClusters() {
    const calcTick = this.mg.ticks();
    const clusters = this.calculateClusters();

    if (clusters.length === 0) {
      this.player.largestClusterBoundingBox = null;
      this.encirclements.clear();
      return;
    }

    // Find the largest cluster with a single linear scan (O(n)).
    let largestIndex = 0;
    let largestSize = clusters[0].length;
    for (let i = 1; i < clusters.length; i++) {
      const size = clusters[i].length;
      if (size > largestSize) {
        largestSize = size;
        largestIndex = i;
      }
    }

    const largestCluster = clusters[largestIndex];
    if (largestCluster === undefined) throw new Error("No clusters");

    const largestClusterBox = calculateBoundingBox(this.mg, largestCluster);
    this.player.largestClusterBoundingBox = largestClusterBox;
    const surroundedBy = this.surroundedBySamePlayer(
      largestCluster,
      largestClusterBox,
    );
    if (surroundedBy && !surroundedBy.isFriendly(this.player)) {
      this.removeCluster(largestCluster);
    }

    // Process remaining clusters
    for (let i = 0; i < clusters.length; i++) {
      if (i === largestIndex) continue;
      const cluster = clusters[i];
      if (this.isSurrounded(cluster)) {
        this.removeCluster(cluster);
      }
    }

    for (const [anchor, state] of this.encirclements) {
      if (state.lastSeen !== calcTick) this.encirclements.delete(anchor);
    }
  }

  private surroundedBySamePlayer(
    cluster: readonly TileRef[],
    clusterBox: { min: Cell; max: Cell },
  ): false | Player {
    let enemyID = 0;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const map = this.map;
    const mySmallID = this.player.smallID();
    for (const tile of cluster) {
      if (map.isOceanShore(tile) || map.isOnEdgeOfMap(tile)) {
        return false;
      }
      const numNeighbors = map.neighbors4(tile, this.nbuf);
      for (let i = 0; i < numNeighbors; i++) {
        const n = this.nbuf[i];
        const ownerId = this.mapState[n] & 0xfff;
        if (ownerId === 0) {
          // Unowned neighbor: the cluster is not fully surrounded.
          return false;
        }
        if (ownerId !== mySmallID) {
          if (enemyID !== 0 && enemyID !== ownerId) return false;
          enemyID = ownerId;
          const px = map.x(n);
          const py = map.y(n);
          minX = Math.min(minX, px);
          minY = Math.min(minY, py);
          maxX = Math.max(maxX, px);
          maxY = Math.max(maxY, py);
        }
      }
      if (enemyID === 0) {
        return false;
      }
    }
    if (enemyID === 0) {
      return false;
    }

    const enemy = this.mg.playerBySmallID(enemyID) as Player;
    const localEnemyBox = {
      min: new Cell(minX, minY),
      max: new Cell(maxX, maxY),
    };
    if (inscribed(localEnemyBox, clusterBox)) {
      return enemy;
    }
    return false;
  }

  private isSurrounded(cluster: readonly TileRef[]): boolean {
    let hasEnemy = false;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    const map = this.map;
    const mySmallID = this.player.smallID();
    for (const tr of cluster) {
      if ((this.mapTerrain[tr] & 0xc0) === 0xc0 || map.isOnEdgeOfMap(tr)) {
        return false;
      }
      const numNeighbors = map.neighbors4(tr, this.nbuf);
      for (let i = 0; i < numNeighbors; i++) {
        const n = this.nbuf[i];
        const ownerId = this.mapState[n] & 0xfff;
        if (ownerId !== 0 && ownerId !== mySmallID) {
          hasEnemy = true;
          const x = map.x(n);
          const y = map.y(n);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    if (!hasEnemy) {
      return false;
    }
    const clusterBox = calculateBoundingBox(this.mg, cluster);
    const enemyBox = { min: new Cell(minX, minY), max: new Cell(maxX, maxY) };
    return inscribed(enemyBox, clusterBox);
  }

  private removeCluster(cluster: readonly TileRef[]) {
    // Aircraft deployment protects every current cluster, including territory
    // gained by the expanding landing wave, from free surrounded annexation.
    if (this.player.hasLandAnnexationProtection()) return;

    // Airborne beachheads must be conquered through normal attacks. Their
    // intentionally surrounded placement must not trigger free annexation.
    if (isPlaneBeachhead(this.mg, this.player, cluster)) return;

    for (const t of cluster) {
      if ((this.mapState[t] & 0xfff) !== this.player.smallID()) {
        // Other removeCluster operations could change tile owners,
        // so double check.
        return;
      }
    }

    const capturing = this.getCapturingPlayer(cluster);
    if (capturing === null) {
      return;
    }
    // A plane beachhead may expand only through normal combat; it cannot use
    // surrounded-cluster annexation against the much larger defender either.
    if (hasPlaneBeachhead(this.mg, capturing)) return;

    if (this.config.worldMechanics().encirclement) {
      let anchor = Number.MAX_SAFE_INTEGER;
      for (const tile of cluster) anchor = Math.min(anchor, tile);
      const now = this.mg.ticks();
      let state = this.encirclements.get(anchor);
      if (!state) {
        state = { since: now, lastSeen: now };
        this.encirclements.set(anchor, state);
        this.mg.displayMessage(
          "events_display.encirclement_started",
          MessageType.ENCIRCLEMENT_STARTED,
          this.player.id(),
          undefined,
          { enemy: capturing.name() },
        );
      }
      state.lastSeen = now;

      // A pocket loses readiness every two-second evaluation. Larger pockets
      // drain proportionally, but the loss is capped so an encirclement never
      // deletes an army in a single update.
      const share = Math.min(
        1,
        cluster.length / Math.max(1, this.player.numTilesOwned()),
      );
      this.player.removeTroops(
        Math.max(1, Math.floor(this.player.troops() * share * 0.0125)),
      );

      // Fifteen seconds gives the defender time to reopen a corridor. Only a
      // continuously closed pocket is annexed.
      if (now - state.since < 150) return;
      this.encirclements.delete(anchor);
    }

    const firstTile = cluster[0];
    if (!firstTile) {
      return;
    }

    const tiles = this.floodFillWithGen(
      this.bumpGeneration(),
      this.traversalState().visited,
      [firstTile],
      (tile, cb) => this.mg.forEachNeighbor(tile, cb),
      (tile) => (this.mapState[tile] & 0xfff) === this.player.smallID(),
    );

    if (this.player.numTilesOwned() === tiles.size) {
      this.mg.conquerPlayer(capturing, this.player);
    }

    for (const tile of tiles) {
      capturing.conquer(tile);
    }
  }

  private updateWarExhaustion(): number {
    if (!this.config.worldMechanics().warExhaustion) return 1;
    const fighting =
      this.player.outgoingAttacks().length > 0 ||
      this.player.incomingAttacks().length > 0;
    if (fighting) {
      this.warExhaustionTicks = Math.min(6_000, this.warExhaustionTicks + 1);
    } else {
      // Recovery is deliberately slower than accumulation: repeated short
      // wars still cost something, while sustained peace fully restores the
      // economy.
      this.warExhaustionTicks = Math.max(0, this.warExhaustionTicks - 0.25);
    }
    const factor = Math.max(0.45, 1 - this.warExhaustionTicks / 10_000);
    const band = Math.floor((1 - factor) / 0.1);
    if (band > this.lastExhaustionBand && band > 0) {
      this.lastExhaustionBand = band;
      this.mg.displayMessage(
        "events_display.war_exhaustion",
        MessageType.WAR_EXHAUSTION,
        this.player.id(),
        undefined,
        { penalty: Math.round((1 - factor) * 100) },
      );
    } else if (band < this.lastExhaustionBand) {
      this.lastExhaustionBand = band;
    }
    return factor;
  }

  private getCapturingPlayer(cluster: readonly TileRef[]): Player | null {
    const neighbors = new Map<Player, number>();
    const map = this.map;
    const mySmallID = this.player.smallID();
    for (const t of cluster) {
      const numNeighbors = map.neighbors4(t, this.nbuf);
      for (let i = 0; i < numNeighbors; i++) {
        const ownerId = this.mapState[this.nbuf[i]] & 0xfff;
        if (ownerId === 0 || ownerId === mySmallID) {
          continue;
        }
        const owner = this.mg.playerBySmallID(ownerId) as Player;
        if (!owner.isFriendly(this.player)) {
          neighbors.set(owner, (neighbors.get(owner) ?? 0) + 1);
        }
      }
    }

    // If there are no enemies, return null
    if (neighbors.size === 0) {
      return null;
    }

    // Get the largest attack from the neighbors
    let largestNeighborAttack: Player | null = null;
    let largestTroopCount = 0;
    for (const [neighbor] of neighbors) {
      for (const attack of neighbor.outgoingAttacks()) {
        if (attack.target() === this.player) {
          if (attack.troops() > largestTroopCount) {
            largestTroopCount = attack.troops();
            largestNeighborAttack = neighbor;
          }
        }
      }
    }

    if (largestNeighborAttack !== null) {
      return largestNeighborAttack;
    }

    // There are no ongoing attacks, so find the enemy with the largest border.
    return getMode(neighbors);
  }

  private calculateClusters(): TileRef[][] {
    const borderTiles = this.player.borderTiles();
    if (borderTiles.size === 0) return [];

    const state = this.traversalState();
    const currentGen = this.bumpGeneration();
    const visited = state.visited;

    const clusters: TileRef[][] = [];

    for (const startTile of borderTiles) {
      if (visited[startTile] === currentGen) continue;

      const cluster: TileRef[] = [];
      const stack: TileRef[] = [startTile];
      visited[startTile] = currentGen;
      cluster.push(startTile);
      while (stack.length > 0) {
        const tile = stack.pop()!;
        const count = this.map.neighbors8(tile, this.diagNbuf);
        for (let i = 0; i < count; i++) {
          const neighbor = this.diagNbuf[i];
          if (visited[neighbor] === currentGen || !borderTiles.has(neighbor)) {
            continue;
          }
          visited[neighbor] = currentGen;
          cluster.push(neighbor);
          stack.push(neighbor);
        }
      }
      clusters.push(cluster);
    }
    return clusters;
  }

  owner(): Player {
    if (this.player === null) {
      throw new Error("Not initialized");
    }
    return this.player;
  }

  isActive(): boolean {
    return this.active;
  }

  private traversalState(): ClusterTraversalState {
    const totalTiles = this.mg.width() * this.mg.height();
    let state = traversalStates.get(this.mg);
    if (!state || state.visited.length < totalTiles) {
      state = {
        // One shared generation buffer serves every player. Uint16 halves the
        // permanent traversal allocation on every map (150 MB saved on Grand
        // Earth); the rare wrap simply clears the buffer.
        visited: new Uint16Array(totalTiles),
        gen: 0,
      };
      traversalStates.set(this.mg, state);
    }
    return state;
  }

  private bumpGeneration(): number {
    const state = this.traversalState();
    state.gen++;
    if (state.gen === 0xffff) {
      state.visited.fill(0);
      state.gen = 1;
    }
    return state.gen;
  }

  private floodFillWithGen(
    currentGen: number,
    visited: Uint16Array,
    startTiles: TileRef[],
    neighborFn: (tile: TileRef, callback: (neighbor: TileRef) => void) => void,
    includeFn: (tile: TileRef) => boolean,
  ): Set<TileRef> {
    const result = new Set<TileRef>();
    const stack: TileRef[] = [];

    for (const start of startTiles) {
      if (visited[start] === currentGen) continue;
      if (!includeFn(start)) continue;
      visited[start] = currentGen;
      result.add(start);
      stack.push(start);
    }

    const visit = (neighbor: TileRef) => {
      if (visited[neighbor] === currentGen) {
        return;
      }
      if (!includeFn(neighbor)) {
        return;
      }
      visited[neighbor] = currentGen;
      result.add(neighbor);
      stack.push(neighbor);
    };

    while (stack.length > 0) {
      const tile = stack.pop()!;
      neighborFn(tile, visit);
    }

    return result;
  }

  private removeOnDeath(): void {
    // Player (bot, human, nation) has no tiles
    // Delete any remaining gold, non-nuke units and alliances
    const gold = this.player.gold();
    this.player.removeGold(gold);

    this.player.units().forEach((u) => {
      if (
        u.type() !== UnitType.AtomBomb &&
        u.type() !== UnitType.HydrogenBomb &&
        u.type() !== UnitType.MIRVWarhead &&
        u.type() !== UnitType.MIRV
      ) {
        u.delete();
      }
    });

    this.player.removeAllAlliances();
  }
}
