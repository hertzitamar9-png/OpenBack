import { EventBus } from "../../core/EventBus";
import { UnitType } from "../../core/game/Game";
import { GameUpdateType } from "../../core/game/GameUpdates";
import { Controller } from "../Controller";
import { PlaySoundEffectEvent, SoundEffect } from "../sound/Sounds";
import type { SoundOrigin } from "../sound/SpatialAudio";
import { GameView, UnitView } from "../view";

// A MIRV rains hundreds of warheads over a few seconds; playing a boom per
// warhead churns the audio pipeline. Play at most one warhead boom per interval.
const MIRV_HIT_SOUND_INTERVAL_TICKS = 5;

export class SoundEffectController implements Controller {
  private lastMirvHitSoundTick = -Infinity;

  constructor(
    private readonly game: GameView,
    private readonly eventBus: EventBus,
  ) {}

  tick(): void {
    const updates = this.game.updatesSinceLastTick();
    if (!updates) return;

    for (const u of updates[GameUpdateType.Unit] ?? []) {
      const unit = this.game.unit(u.id);
      if (unit === undefined) continue;
      this.handleUnit(unit);
    }

    const myPlayer = this.game.myPlayer();
    if (myPlayer === null) return;
    for (const c of updates[GameUpdateType.ConquestEvent] ?? []) {
      if (c.conquerorId === myPlayer.id()) {
        this.emit("ka-ching");
      }
    }
  }

  private handleUnit(unit: UnitView): void {
    if (unit.isActive() && unit.createdAt() === this.game.ticks()) {
      this.onCreated(unit);
    }
    switch (unit.type()) {
      case UnitType.AtomBomb:
        this.onNukeDetonation(unit, "atom-hit");
        break;
      case UnitType.MIRVWarhead:
        this.onMirvWarheadDetonation(unit);
        break;
      case UnitType.HydrogenBomb:
        this.onNukeDetonation(unit, "hydrogen-hit");
        break;
    }
  }

  private onMirvWarheadDetonation(unit: UnitView): void {
    if (unit.isActive()) return;
    if (!unit.reachedTarget()) return;
    const tick = this.game.ticks();
    if (tick - this.lastMirvHitSoundTick < MIRV_HIT_SOUND_INTERVAL_TICKS) {
      return;
    }
    this.lastMirvHitSoundTick = tick;
    this.emit("atom-hit", unit);
  }

  private onCreated(unit: UnitView): void {
    const myPlayer = this.game.myPlayer();
    switch (unit.type()) {
      case UnitType.AtomBomb:
        this.emit("atom-launch", unit);
        break;
      case UnitType.HydrogenBomb:
        this.emit("hydrogen-launch", unit);
        break;
      case UnitType.MIRV:
        this.emit("mirv-launch", unit);
        break;
      case UnitType.Warship:
        if (unit.owner() === myPlayer) this.emit("build-warship", unit);
        break;
      case UnitType.City:
        if (unit.owner() === myPlayer) this.emit("build-city", unit);
        break;
      case UnitType.Port:
        if (unit.owner() === myPlayer) this.emit("build-port", unit);
        break;
      case UnitType.DefensePost:
        if (unit.owner() === myPlayer) this.emit("build-defense-post", unit);
        break;
      case UnitType.SAMLauncher:
        if (unit.owner() === myPlayer) this.emit("sam-built", unit);
        break;
      case UnitType.MissileSilo:
        if (unit.owner() === myPlayer) this.emit("silo-built", unit);
        break;
    }
  }

  private onNukeDetonation(unit: UnitView, sound: SoundEffect): void {
    if (unit.isActive()) return;
    if (!unit.reachedTarget()) return;
    this.emit(sound, unit);
  }

  // Everything that happens to a unit happens somewhere, so pass that place
  // along: in Immersive 3D the sound is then played from it.
  private emit(sound: SoundEffect, unit?: UnitView): void {
    this.eventBus.emit(
      new PlaySoundEffectEvent(sound, unit && this.originOf(unit)),
    );
  }

  private originOf(unit: UnitView): SoundOrigin | undefined {
    try {
      const tile = unit.tile();
      return { x: this.game.x(tile), y: this.game.y(tile) };
    } catch {
      // A unit that died this tick can have no tile left to read.
      return undefined;
    }
  }
}
