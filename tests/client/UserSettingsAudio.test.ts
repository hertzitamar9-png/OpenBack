import { beforeEach, describe, expect, it } from "vitest";
import { UserSettings } from "../../src/core/game/UserSettings";

describe("UserSettings audio defaults", () => {
  beforeEach(() => {
    localStorage.clear();
    (
      UserSettings as unknown as { cache: Map<string, string | null> }
    ).cache.clear();
  });

  it("starts new players with restrained audible defaults", () => {
    const settings = new UserSettings();
    expect(settings.backgroundMusicVolume()).toBe(0.32);
    expect(settings.soundEffectsVolume()).toBe(0.6);
  });

  it("preserves an explicitly saved mute", () => {
    const settings = new UserSettings();
    settings.setBackgroundMusicVolume(0);
    settings.setSoundEffectsVolume(0);

    expect(settings.backgroundMusicVolume()).toBe(0);
    expect(settings.soundEffectsVolume()).toBe(0);
  });
});
