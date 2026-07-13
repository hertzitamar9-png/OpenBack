import { describe, expect, it } from "vitest";
import { Difficulty, GameMapSize } from "../../src/core/game/Game";
import { MapPlaylist } from "../../src/server/MapPlaylist";

describe("ranked 1v1 playlist", () => {
  it("does not repeat the same map on consecutive matches", () => {
    const playlist = new MapPlaylist();
    const first = playlist.get1v1Config(() => 0);
    const second = playlist.get1v1Config(() => 0);

    expect(second.gameMap).not.toBe(first.gameMap);
  });

  it("can create a compact low-bot match without nations", () => {
    const config = new MapPlaylist().get1v1Config(() => 0);

    expect(config.gameMapSize).toBe(GameMapSize.Compact);
    expect(config.nations).toBe("disabled");
    expect(config.bots).toBe(25);
    expect(config.startingGold).toBe(0);
    expect(config.goldMultiplier).toBe(1);
    expect(config.randomSpawn).toBe(true);
  });

  it("can create a normal high-bot match with hard nations and boosted gold", () => {
    let randomCall = 0;
    const config = new MapPlaylist().get1v1Config(() =>
      randomCall++ === 6 ? 0 : 0.999,
    );

    expect(config.gameMapSize).toBe(GameMapSize.Normal);
    expect(config.nations).toBe("default");
    expect(config.bots).toBe(400);
    expect(config.startingGold).toBe(25_000_000);
    expect(config.goldMultiplier).toBe(3);
    expect(config.difficulty).toBe(Difficulty.Hard);
    expect(config.randomSpawn).toBe(false);
  });
});
