import { AttackExecution } from "../execution/AttackExecution";
import { ConstructionExecution } from "../execution/ConstructionExecution";
import { PlayerExecution } from "../execution/PlayerExecution";
import { TransportShipExecution } from "../execution/TransportShipExecution";
import {
  Execution,
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../game/Game";
import { StampedIntent, Turn } from "../Schemas";
import {
  isTutorialConfig,
  MIN_MISSION_TICKS,
  MISSION_STAGES,
  MissionCommand,
  MissionSnapshot,
} from "./Mission";
import { TUTORIAL_POINTS } from "./TutorialTerrain";

/** A single-player exercise controller. Actors receive only explicit orders;
 * neither NationExecution nor TribeExecution is ever installed for them. */
export class MissionDirector implements Execution {
  private game: Game;
  private initialized = false;
  private me: Player;
  private red: Player;
  private island: Player;
  private phase = 0;
  private phaseTicks = 0;
  private elapsedTicks = 0;
  private startTiles = 0;
  private enemyStartTiles = 0;
  private ratioChanged = false;
  private initialRatio: number | null = null;
  private completed = false;
  private skipped = false;
  private recovered = 0;
  private cue: MissionSnapshot["cue"] = "briefing";
  private lastSupplyTick = -300;
  private readonly owned = new Set<UnitType>();
  private commands: MissionCommand[] = [];

  constructor(game: Game) {
    if (!isTutorialConfig(game.config().gameConfig()))
      throw new Error("Mission requires singleplayer tutorial config");
    this.game = game;
  }
  init(): void {}
  isActive(): boolean {
    return !this.completed && !this.skipped;
  }
  activeDuringSpawnPhase(): boolean {
    return true;
  }

  command(command: MissionCommand): void {
    // Skip must also work when the local server is paused and sends no ticks.
    if (command.action === "skip" && command.phase === this.phase) {
      this.skipped = true;
      return;
    }
    // Bounded local queue; stale UI commands cannot skip a later chapter.
    if (this.commands.length < 8 && command.phase === this.phase)
      this.commands.push(command);
  }

  filterTurn(turn: Turn): Turn {
    if (this.skipped || this.completed) return turn;
    const allowedUnits = new Set(
      MISSION_STAGES.slice(0, this.phase + 1).flatMap((s) =>
        s.unit ? [s.unit] : [],
      ),
    );
    return {
      ...turn,
      intents: turn.intents.filter((intent: StampedIntent) => {
        if (intent.type === "spawn") {
          if (!this.game.isValidRef(intent.tile)) return false;
          const p = TUTORIAL_POINTS.home;
          return (
            Math.hypot(
              this.game.x(intent.tile) - p.x,
              this.game.y(intent.tile) - p.y,
            ) <= 32
          );
        }
        if (intent.type === "build_unit") {
          if (!allowedUnits.has(intent.unit)) return false;
          if (intent.unit === UnitType.AtomBomb) {
            const p = TUTORIAL_POINTS.target;
            return (
              this.game.isValidRef(intent.tile) &&
              Math.hypot(
                this.game.x(intent.tile) - p.x,
                this.game.y(intent.tile) - p.y,
              ) < 55
            );
          }
        }
        if (
          intent.type === "attack" &&
          intent.targetID !== null &&
          this.phase < 8
        )
          return false;
        if (intent.type === "boat" && this.phase < 9) return false;
        // Prevent sandbox configuration changes and accidental destruction of
        // prerequisites; these controls still work in ordinary games.
        return ![
          "update_game_config",
          "delete_unit",
          "allianceRequest",
          "kick_player",
          "set_player_team",
        ].includes(intent.type);
      }),
    };
  }

  tick(): void {
    if (this.game.isPaused()) return;
    if (!this.initialized) this.setup();
    for (const command of this.commands.splice(0)) {
      if (command.phase !== this.phase) continue;
      if (command.action === "skip") this.skipped = true;
      if (command.action === "recover") this.resupply();
      if (
        command.action === "ratio" &&
        this.phase === 2 &&
        Number.isFinite(command.value)
      ) {
        if (this.initialRatio === null) this.initialRatio = command.value;
        else if (Math.abs(command.value - this.initialRatio) >= 0.01)
          this.ratioChanged = true;
      }
    }
    if (this.skipped) return;
    if (this.game.inSpawnPhase()) return;
    this.elapsedTicks++;
    this.phaseTicks++;
    for (const unit of this.me.units()) {
      if (unit.isActive() && !unit.isUnderConstruction())
        this.owned.add(unit.type());
    }
    // Script actors hold a fixed defensive strength. No economy-driven AI,
    // random building choices or surprise attacks can derail the lesson.
    for (const actor of [this.red, this.island]) {
      if (actor.troops() > 2200) actor.removeTroops(actor.troops() - 2200);
    }
    if (this.phase === 7 && [30, 180].includes(this.phaseTicks)) {
      this.cue = this.phaseTicks === 30 ? "raid_one" : "raid_two";
      this.red.addTroops(1200);
      this.game.addExecution(new AttackExecution(1200, this.red, this.me.id()));
    }
    if (this.phase === 10 && this.phaseTicks === 40) {
      this.cue = "convoy";
      this.island.addTroops(1500);
      const p = TUTORIAL_POINTS.harbor;
      this.game.addExecution(
        new TransportShipExecution(this.island, this.game.ref(p.x, p.y), 1500),
      );
    }
    if (this.phase === 12 && this.objectiveMet()) this.cue = "impact";
    if (
      this.objectiveMet() &&
      this.phaseTicks >= MISSION_STAGES[this.phase].minimumTicks
    ) {
      if (this.phase === MISSION_STAGES.length - 1) {
        this.completed = this.elapsedTicks >= MIN_MISSION_TICKS;
      } else {
        this.phase++;
        this.phaseTicks = 0;
        if (this.phase === 1) this.me.addTroops(75000);
        if (this.phase === 3) {
          // After the two expansion drills, Command hands over the rest of
          // the coastal training district. This is an announced mission event,
          // not fake player progress or an objective completed on their behalf.
          for (let y = 90; y < 465; y++)
            for (let x = 40; x < 390; x++) {
              const t = this.game.ref(x, y);
              if (this.game.isLand(t) && !this.game.hasOwner(t))
                this.me.conquer(t);
            }
          this.me.addTroops(50000);
        }
        this.startTiles = this.me.numTilesOwned();
        this.enemyStartTiles = this.red.numTilesOwned();
      }
    }
  }

  private objectiveMet(): boolean {
    if (!this.initialized) return false;
    const stage = MISSION_STAGES[this.phase];
    if (stage.id === "spawn") return this.me.hasSpawned();
    if (stage.id === "expand")
      return this.me.numTilesOwned() >= this.startTiles + 600;
    if (stage.id === "ratio") return this.ratioChanged;
    if (stage.id === "hold")
      return (
        this.me
          .units(UnitType.DefensePost)
          .some((u) => u.isActive() && !u.isUnderConstruction()) &&
        this.me.numTilesOwned() >= 1000 &&
        this.phaseTicks >= 350
      );
    if (stage.id === "counter")
      return (
        this.red.numTilesOwned() <= this.enemyStartTiles - 100 ||
        this.red.numTilesOwned() === 0
      );
    if (stage.id === "landing")
      return (
        this.owned.has(UnitType.TransportShip) &&
        [...this.me.tiles()].some((t) => this.game.x(t) > 500)
      );
    if (stage.id === "strike")
      return (
        this.owned.has(UnitType.AtomBomb) &&
        this.me.units(UnitType.AtomBomb).length === 0
      );
    if (stage.id === "secure")
      return (
        this.me.units(UnitType.City).some((u) => u.isActive()) &&
        this.me.units(UnitType.Port).some((u) => u.isActive()) &&
        [...this.me.tiles()].some((t) => this.game.x(t) > 500)
      );
    return stage.unit !== undefined && this.owned.has(stage.unit);
  }

  private actor(
    name: string,
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
  ): Player {
    const player = this.game.addPlayer(
      new PlayerInfo(name, PlayerType.Nation, null, id),
    );
    for (
      let y = Math.max(0, cy - ry);
      y <= Math.min(this.game.height() - 1, cy + ry);
      y++
    ) {
      for (
        let x = Math.max(0, cx - rx);
        x <= Math.min(this.game.width() - 1, cx + rx);
        x++
      ) {
        const tile = this.game.ref(x, y);
        if (
          this.game.isLand(tile) &&
          ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
        )
          player.conquer(tile);
      }
    }
    player.setSpawnTile(this.game.ref(cx, cy));
    player.addGold(3000000n);
    player.addTroops(2200);
    this.game.addExecution(new PlayerExecution(player));
    return player;
  }

  private setup(): void {
    this.me = this.game
      .allPlayers()
      .find((p) => p.type() === PlayerType.Human)!;
    this.red = this.actor(
      "Redoubt · Training",
      "tutorial-redoubt",
      300,
      170,
      62,
      78,
    );
    this.island = this.actor(
      "Beacon · Training",
      "tutorial-beacon",
      633,
      225,
      105,
      140,
    );
    const friend = this.actor(
      "Harbor Command",
      "tutorial-harbor",
      438,
      425,
      48,
      30,
    );
    for (const actor of [this.island, friend]) {
      const coast = [...actor.tiles()].find(
        (t) =>
          this.game.isOceanShore(t) &&
          actor.canBuild(UnitType.Port, t) !== false,
      );
      if (coast !== undefined)
        this.game.addExecution(
          new ConstructionExecution(actor, UnitType.Port, coast),
        );
    }
    this.initialized = true;
  }

  private resupply(): void {
    if (!this.me.hasSpawned()) return;
    if (this.elapsedTicks - this.lastSupplyTick < 100) return;
    this.lastSupplyTick = this.elapsedTicks;
    this.recovered++;
    this.cue = "resupplied";
    if (this.me.gold() < 5000000n) this.me.addGold(5000000n - this.me.gold());
    if (this.me.troops() < 100000) this.me.addTroops(100000 - this.me.troops());
    // Recovery never checks off an objective. Restore a small safe foothold
    // only if defeated, so the player can rebuild using normal controls.
    if (this.me.numTilesOwned() < 100) {
      const p = TUTORIAL_POINTS.home;
      for (let y = p.y - 18; y <= p.y + 18; y++)
        for (let x = p.x - 18; x <= p.x + 18; x++) {
          const t = this.game.ref(x, y);
          if (this.game.isLand(t)) this.me.conquer(t);
        }
      this.startTiles = this.me.numTilesOwned();
    }
  }

  snapshot(): MissionSnapshot {
    return {
      phase: this.phase,
      elapsedTicks: this.elapsedTicks,
      phaseTicks: this.phaseTicks,
      objectiveMet: this.objectiveMet(),
      completed: this.completed,
      skipped: this.skipped,
      recovered: this.recovered,
      cue: this.cue,
    };
  }
}
