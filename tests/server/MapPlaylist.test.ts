import { describe, expect, it } from "vitest";
import {
  Difficulty,
  GameMapSize,
  GameMode,
  RankedType,
} from "../../src/core/game/Game";
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
    expect(config.worldMechanics?.strategicObjectives).toBe(true);
    expect(config.worldMechanics?.warExhaustion).toBe(true);
  });

  it("rolls at most one optional world modifier in ranked", () => {
    for (const roll of [0.1, 0.25, 0.38, 0.8]) {
      let call = 0;
      const config = new MapPlaylist().get1v1Config(() => {
        call++;
        return call === 8 ? roll : 0.5;
      });
      const modifiers = [
        config.worldMechanics?.strategicObjectives,
        config.worldMechanics?.naturalDisasters,
        config.worldMechanics?.fogOfWar,
      ].filter(Boolean);
      expect(modifiers.length).toBeLessThanOrEqual(1);
    }
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

  it("creates ordered shared-control team ranked rules", () => {
    const teams = [
      ["a", "b", "c", "d"],
      ["e", "f", "g", "h"],
    ];
    const config = new MapPlaylist().getRankedConfig(
      4,
      teams,
      { bots: 200, nations: 100 },
      () => 0,
    );

    expect(config.rankedType).toBe(RankedType.FourVFour);
    expect(config.gameMode).toBe(GameMode.Team);
    expect(config.playerTeams).toBe(2);
    expect(config.maxPlayers).toBe(8);
    expect(config.worldMechanics?.sharedControlSize).toBe(4);
    expect(config.rankedTeams).toEqual(teams);
    expect(config.allowedPublicIds).toEqual(teams.flat());
    expect(config.bots).toBe(200);
    expect(config.nations).toBe(100);
  });
});
