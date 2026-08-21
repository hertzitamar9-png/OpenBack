import { Howl, Howler } from "howler";
import { EventBus } from "../../core/EventBus";
import { UserSettings } from "../../core/game/UserSettings";
import { UpdateSuspensionEvent } from "../openback/UpdateWatcher";
import {
  backgroundMusicUrls,
  PlaySoundEffectEvent,
  SetBackgroundMusicVolumeEvent,
  SetSoundEffectsVolumeEvent,
  SoundEffect,
  soundEffectUrls,
} from "./Sounds";

export const MAX_CONCURRENT_SOUNDS = 8;

export class SoundManager {
  private backgroundMusic: Howl[] = [];
  private currentTrack: number = 0;
  private soundEffects: Map<SoundEffect, Howl> = new Map();
  private soundEffectsVolume: number = 1;
  private backgroundMusicVolume: number = 0;
  private activeSounds: { howl: Howl; id: number }[] = [];
  private audioUnlocked = false;
  private suspendedForUpdate = false;
  private disposed = false;
  private eventBus: EventBus;
  private onPlaySoundEffect: (e: PlaySoundEffectEvent) => void;
  private onSetBackgroundMusicVolume: (
    e: SetBackgroundMusicVolumeEvent,
  ) => void;
  private onSetSoundEffectsVolume: (e: SetSoundEffectsVolumeEvent) => void;
  private onUpdateSuspension: (e: UpdateSuspensionEvent) => void;

  constructor(eventBus: EventBus, userSettings: UserSettings) {
    this.eventBus = eventBus;
    // The upstream music files live in the restricted proprietary asset set.
    // OpenBack keeps the open sound effects and intentionally starts without
    // background tracks rather than requesting missing or unlicensed files.
    this.setBackgroundMusicVolume(userSettings.backgroundMusicVolume());
    this.setSoundEffectsVolume(userSettings.soundEffectsVolume());
    this.backgroundMusic = backgroundMusicUrls.map(
      (src) =>
        new Howl({
          src: [src],
          loop: true,
          volume: this.backgroundMusicVolume,
        }),
    );
    this.onPlaySoundEffect = (e) => this.playSoundEffect(e.effect);
    this.onSetBackgroundMusicVolume = (e) =>
      this.setBackgroundMusicVolume(e.volume);
    this.onSetSoundEffectsVolume = (e) => this.setSoundEffectsVolume(e.volume);
    this.onUpdateSuspension = (e) =>
      e.suspended ? this.suspendForUpdate() : this.resumeAfterUpdate();
    eventBus.on(PlaySoundEffectEvent, this.onPlaySoundEffect);
    eventBus.on(SetBackgroundMusicVolumeEvent, this.onSetBackgroundMusicVolume);
    eventBus.on(SetSoundEffectsVolumeEvent, this.onSetSoundEffectsVolume);
    eventBus.on(UpdateSuspensionEvent, this.onUpdateSuspension);
    document.addEventListener("pointerdown", this.unlockAudio, { once: true });
    document.addEventListener("keydown", this.unlockAudio, { once: true });
    document.addEventListener("visibilitychange", this.onVisibilityChange);
  }

  public dispose(): void {
    this.disposed = true;
    document.removeEventListener("pointerdown", this.unlockAudio);
    document.removeEventListener("keydown", this.unlockAudio);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.eventBus.off(PlaySoundEffectEvent, this.onPlaySoundEffect);
    this.eventBus.off(
      SetBackgroundMusicVolumeEvent,
      this.onSetBackgroundMusicVolume,
    );
    this.eventBus.off(SetSoundEffectsVolumeEvent, this.onSetSoundEffectsVolume);
    this.eventBus.off(UpdateSuspensionEvent, this.onUpdateSuspension);
    this.backgroundMusic.forEach((track) => {
      this.safely("stop background track", () => track.stop());
      this.safely("unload background track", () => track.unload());
    });
    this.soundEffects.forEach((sound) => {
      this.safely("stop sound effect", () => sound.stop());
      this.safely("unload sound effect", () => sound.unload());
    });
    this.soundEffects.clear();
    this.activeSounds = [];
  }

  private safely(action: string, fn: () => void): void {
    try {
      fn();
    } catch (err) {
      console.error(`SoundManager: failed to ${action}`, err);
    }
  }

  public playBackgroundMusic(): void {
    this.safely("play background music", () => {
      if (
        this.audioUnlocked &&
        !this.suspendedForUpdate &&
        !document.hidden &&
        this.backgroundMusicVolume > 0 &&
        this.backgroundMusic.length > 0 &&
        !this.backgroundMusic[this.currentTrack].playing()
      ) {
        this.backgroundMusic[this.currentTrack].play();
      }
    });
  }

  public stopBackgroundMusic(): void {
    this.safely("stop background music", () => {
      if (this.backgroundMusic.length > 0) {
        this.backgroundMusic[this.currentTrack].stop();
      }
    });
  }

  // Slider positions are linear (0–1) but perceived loudness is roughly
  // logarithmic, so feeding the position straight to Howler makes the top of
  // the range sound identical. Square the position for an audio-taper curve.
  private perceptualGain(position: number): number {
    const clamped = Math.max(0, Math.min(1, position));
    return clamped * clamped;
  }

  public setBackgroundMusicVolume(volume: number): void {
    this.backgroundMusicVolume = this.perceptualGain(volume);
    this.safely("set background music volume", () => {
      this.backgroundMusic.forEach((track) => {
        track.volume(this.backgroundMusicVolume);
      });
    });
    if (this.backgroundMusicVolume > 0) this.playBackgroundMusic();
    else this.stopBackgroundMusic();
  }

  private playNext(): void {
    if (this.backgroundMusic.length === 0) return;
    this.currentTrack = (this.currentTrack + 1) % this.backgroundMusic.length;
    this.playBackgroundMusic();
  }

  private getOrLoadSoundEffect(name: SoundEffect): Howl | null {
    let sound = this.soundEffects.get(name);
    if (sound) return sound;
    const src = soundEffectUrls.get(name);
    if (!src) return null;
    try {
      sound = new Howl({ src: [src], volume: this.soundEffectsVolume });
      this.soundEffects.set(name, sound);
      return sound;
    } catch (err) {
      console.error(`SoundManager: failed to load sound ${name}`, err);
      return null;
    }
  }

  private removeActiveSoundById(id: number): void {
    this.activeSounds = this.activeSounds.filter((s) => s.id !== id);
  }

  public playSoundEffect(name: SoundEffect): void {
    this.safely(`play sound ${name}`, () => {
      if (this.suspendedForUpdate || this.soundEffectsVolume <= 0) return;
      const howl = this.getOrLoadSoundEffect(name);
      if (!howl) return;

      if (this.activeSounds.length >= MAX_CONCURRENT_SOUNDS) {
        const oldest = this.activeSounds[0];
        oldest.howl.stop(oldest.id);
        this.removeActiveSoundById(oldest.id);
      }

      const id = howl.play();
      this.activeSounds.push({ howl, id });
      howl.once("end", () => this.removeActiveSoundById(id), id);
      howl.once("stop", () => this.removeActiveSoundById(id), id);
    });
  }

  public setSoundEffectsVolume(volume: number): void {
    this.soundEffectsVolume = this.perceptualGain(volume);
    this.safely("set sound effects volume", () => {
      this.soundEffects.forEach((sound) => {
        sound.volume(this.soundEffectsVolume);
      });
    });
  }

  public stopSoundEffect(name: SoundEffect): void {
    this.safely(`stop sound ${name}`, () => {
      const howl = this.soundEffects.get(name);
      if (howl) {
        howl.stop();
        this.activeSounds = this.activeSounds.filter((s) => s.howl !== howl);
      }
    });
  }

  public suspendForUpdate(): void {
    if (this.suspendedForUpdate) return;
    this.suspendedForUpdate = true;
    this.backgroundMusic.forEach((track) =>
      this.safely("pause background track", () => track.pause()),
    );
    for (const active of this.activeSounds) {
      this.safely("stop active sound", () => active.howl.stop(active.id));
    }
    this.activeSounds = [];
  }

  public resumeAfterUpdate(): void {
    if (!this.suspendedForUpdate) return;
    this.suspendedForUpdate = false;
    this.playBackgroundMusic();
  }

  private unlockAudio = async (): Promise<void> => {
    if (this.audioUnlocked || this.disposed) return;
    this.audioUnlocked = true;
    document.removeEventListener("pointerdown", this.unlockAudio);
    document.removeEventListener("keydown", this.unlockAudio);
    try {
      await Howler.ctx?.resume();
    } catch (error) {
      console.warn("SoundManager: failed to unlock audio", error);
    }
    if (!this.disposed) this.playBackgroundMusic();
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.backgroundMusic.forEach((track) =>
        this.safely("pause hidden background track", () => track.pause()),
      );
    } else {
      this.playBackgroundMusic();
    }
  };
}
