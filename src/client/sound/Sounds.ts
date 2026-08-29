import { assetUrl } from "../../core/AssetUrls";
import { GameEvent } from "../../core/EventBus";
import type { SoundOrigin } from "./SpatialAudio";

export type SoundEffect =
  | "ka-ching"
  | "atom-hit"
  | "atom-launch"
  | "hydrogen-hit"
  | "hydrogen-launch"
  | "mirv-launch"
  | "alliance-suggested"
  | "alliance-broken"
  | "build-port"
  | "build-city"
  | "build-defense-post"
  | "build-warship"
  | "sam-built"
  | "silo-built"
  | "message"
  | "click";

/**
 * OpenBack ships no background music. Upstream's tracks live in its
 * `proprietary/` asset set, whose licence forbids using them in another
 * project or redistributing them apart from OpenFront, so they cannot be
 * carried here. The sound effects under `resources/sounds/effects` are the
 * open ones and are used unchanged.
 */
/**
 * The background score, one track per experience.
 *
 * Each is three hours long, so they are streamed rather than decoded up front
 * -- see the html5 flag in SoundManager. A player only ever downloads the part
 * they hear.
 */
export const backgroundMusicUrls: Readonly<Record<"2d" | "3d", string>> = {
  "2d": assetUrl("sounds/music/openback-theme-2d.webm"),
  "3d": assetUrl("sounds/music/openback-theme-3d.webm"),
};

export const soundEffectUrls: ReadonlyMap<SoundEffect, string> = new Map([
  ["ka-ching", assetUrl("sounds/effects/ka-ching.mp3")],
  ["atom-hit", assetUrl("sounds/effects/atom-hit.mp3")],
  ["atom-launch", assetUrl("sounds/effects/atom-launch.mp3")],
  ["hydrogen-hit", assetUrl("sounds/effects/hydrogen-hit.mp3")],
  ["hydrogen-launch", assetUrl("sounds/effects/hydrogen-launch.mp3")],
  ["mirv-launch", assetUrl("sounds/effects/mirv-launch.mp3")],
  ["alliance-suggested", assetUrl("sounds/effects/alliance-suggested.mp3")],
  ["alliance-broken", assetUrl("sounds/effects/alliance-broken.mp3")],
  ["build-port", assetUrl("sounds/effects/build-port.mp3")],
  ["build-city", assetUrl("sounds/effects/build-city.mp3")],
  ["build-defense-post", assetUrl("sounds/effects/build-defense-post.mp3")],
  ["build-warship", assetUrl("sounds/effects/build-warship.mp3")],
  ["sam-built", assetUrl("sounds/effects/sam-built.mp3")],
  ["silo-built", assetUrl("sounds/effects/silo-built.mp3")],
  ["message", assetUrl("sounds/effects/message.mp3")],
  ["click", assetUrl("sounds/effects/click.mp3")],
]);

export class PlaySoundEffectEvent implements GameEvent {
  constructor(
    public readonly effect: SoundEffect,
    /**
     * Where on the map it happened, for positional playback in Immersive 3D.
     * Interface sounds (a click, a chat message) have no place in the world
     * and leave this undefined, so they play flat.
     */
    public readonly origin?: SoundOrigin,
  ) {}
}

export class SetSoundEffectsVolumeEvent implements GameEvent {
  constructor(public readonly volume: number) {}
}

export class SetBackgroundMusicVolumeEvent implements GameEvent {
  constructor(public readonly volume: number) {}
}
