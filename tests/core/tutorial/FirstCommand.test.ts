import { describe, expect, it } from "vitest";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../../src/core/game/Game";
import { GameMapLoader } from "../../../src/core/game/GameMapLoader";
import { GameUpdateViewData } from "../../../src/core/game/GameUpdates";
import { createGameRunner } from "../../../src/core/GameRunner";
import { StampedIntent } from "../../../src/core/Schemas";
import {
  isTutorialConfig,
  MIN_MISSION_TICKS,
  MISSION_STAGES,
} from "../../../src/core/tutorial/Mission";
import {
  createTutorialTerrain,
  TUTORIAL_POINTS,
} from "../../../src/core/tutorial/TutorialTerrain";

describe("First Command mission", () => {
  it("requires a singleplayer game as well as the version marker", () => {
    expect(
      isTutorialConfig({
        gameType: GameType.Singleplayer,
        tutorialMission: "first-command-v1",
      }),
    ).toBe(true);
    expect(
      isTutorialConfig({
        gameType: GameType.Public,
        tutorialMission: "first-command-v1",
      }),
    ).toBe(false);
    expect(isTutorialConfig({ gameType: GameType.Singleplayer })).toBe(false);
  });
  it("provides five minutes of paced active exercises, not a short slideshow", () => {
    expect(MIN_MISSION_TICKS).toBeGreaterThanOrEqual(3000);
    expect(
      MISSION_STAGES.reduce((total, stage) => total + stage.minimumTicks, 0),
    ).toBeGreaterThanOrEqual(3000);
    expect(new Set(MISSION_STAGES.map((s) => s.id)).size).toBe(
      MISSION_STAGES.length,
    );
  });
  it("builds identical connected terrain with usable scripted destinations", () => {
    const a = createTutorialTerrain(),
      b = createTutorialTerrain();
    expect(a.gameMap.terrainBuffer()).toEqual(b.gameMap.terrainBuffer());
    for (const [key, point] of Object.entries(TUTORIAL_POINTS)) {
      expect(a.gameMap.isLand(a.gameMap.ref(point.x, point.y))).toBe(
        key !== "sea",
      );
    }
    expect(a.nations).toEqual([]);
    expect(a.gameMap.width()).toBe(a.miniGameMap.width() * 2);
  });
});

async function mission() {
  let update: GameUpdateViewData | undefined;
  const runner = await createGameRunner(
    {
      gameID: "tutorial-test",
      lobbyCreatedAt: 0,
      players: [{ clientID: "human", username: "Recruit", clanTag: null }],
      config: {
        tutorialMission: "first-command-v1",
        gameType: GameType.Singleplayer,
        gameMap: GameMapType.World,
        gameMapSize: GameMapSize.Normal,
        gameMode: GameMode.FFA,
        difficulty: Difficulty.Easy,
        nations: "disabled",
        bots: 0,
        donateGold: false,
        donateTroops: false,
        infiniteGold: false,
        infiniteTroops: false,
        instantBuild: false,
        randomSpawn: false,
        startingGold: 5000000,
      },
    },
    "human",
    {} as GameMapLoader,
    (value) => {
      if ("errMsg" in value) throw new Error(value.errMsg);
      update = value;
    },
  );
  let turn = 0;
  const advance = (ticks: number, intents: StampedIntent[] = []) => {
    for (let i = 0; i < ticks; i++) {
      runner.addTurn({ turnNumber: turn++, intents: i === 0 ? intents : [] });
      expect(runner.executeNextTick()).toBe(true);
    }
    return update!.tutorial!;
  };
  return { runner, advance };
}

describe("mission simulation", () => {
  it("restores the real economy after a defeated recruit requests recovery", async () => {
    const { runner, advance } = await mission();
    const player = runner.game.playerByClientID("human")!;
    advance(4, [
      { type: "spawn", clientID: "human", tile: runner.game.ref(145, 285) },
    ]);
    for (const tile of [...player.tiles()]) player.relinquish(tile);
    const defeated = advance(20);
    expect(player.isAlive()).toBe(false);
    runner.tutorialCommand({ phase: defeated.phase, action: "recover" });
    const restored = advance(3);
    expect(player.isAlive()).toBe(true);
    expect(restored.phase).toBe(defeated.phase);
    const gold = player.gold();
    advance(30);
    expect(player.gold()).toBeGreaterThan(gold);
  });
  it("finishes every real construction, battle, landing and strike without skipping", async () => {
    const { runner, advance } = await mission();
    const g = runner.game;
    const me = g.playerByClientID("human")!;
    advance(4, [{ type: "spawn", clientID: "human", tile: g.ref(145, 285) }]);
    const visited = new Set<number>();
    const scriptedEvents = new Map<string, [number, number]>();
    let previous = -1;
    let snapshot = advance(1);
    for (let tick = 0; tick < 10000 && !snapshot.completed; tick++) {
      const phase = snapshot.phase,
        stage = MISSION_STAGES[phase];
      const intents: StampedIntent[] = [];
      if (phase !== previous || tick % 150 === 0) {
        previous = phase;
        visited.add(phase);
        runner.tutorialCommand({ phase, action: "recover" });
        if (phase === 1)
          intents.push({
            type: "attack",
            clientID: "human",
            targetID: null,
            troops: 50000,
          });
        if (phase === 2) {
          runner.tutorialCommand({ phase, action: "ratio", value: 0.2 });
          runner.tutorialCommand({ phase, action: "ratio", value: 0.4 });
        }
        if (phase === 8)
          intents.push({
            type: "attack",
            clientID: "human",
            targetID: "tutorial-redoubt",
            troops: 50000,
          });
        if (phase === 9)
          intents.push({
            type: "boat",
            clientID: "human",
            dst: g.ref(521, 225),
            troops: 50000,
          });
        if (stage.unit && me.units(stage.unit).length === 0) {
          const point = TUTORIAL_POINTS[stage.point];
          const tile = g.ref(point.x, point.y);
          expect(
            me.canBuild(stage.unit, tile),
            `${stage.id} marker must be usable`,
          ).not.toBe(false);
          intents.push({
            type: "build_unit",
            clientID: "human",
            unit: stage.unit,
            tile,
          });
        }
      }
      snapshot = advance(1, intents);
      if (
        ["raid_one", "raid_two", "convoy"].includes(snapshot.cue) &&
        !scriptedEvents.has(snapshot.cue)
      )
        scriptedEvents.set(snapshot.cue, [snapshot.phase, snapshot.phaseTicks]);
    }
    expect({
      phase: snapshot.phase,
      completed: snapshot.completed,
      troops: me.troops(),
      units: me.units().map((u) => u.type()),
      tiles: me.numTilesOwned(),
    }).toMatchObject({ completed: true });
    expect(snapshot.elapsedTicks).toBeGreaterThanOrEqual(3000);
    expect(snapshot.skipped).toBe(false);
    expect(visited.size).toBe(MISSION_STAGES.length - 1);
    expect([...scriptedEvents]).toEqual([
      ["raid_one", [7, 30]],
      ["raid_two", [7, 180]],
      ["convoy", [10, 40]],
    ]);
  }, 60000);
  it("sets up scripted actors, rejects off-course spawn and waits for a real slider movement", async () => {
    const { runner, advance } = await mission();
    advance(3);
    expect(runner.game.allPlayers().length).toBe(4);
    advance(3, [
      { type: "spawn", clientID: "human", tile: runner.game.ref(620, 225) },
    ]);
    expect(runner.game.inSpawnPhase()).toBe(true);
    advance(3, [
      { type: "spawn", clientID: "human", tile: runner.game.ref(145, 285) },
    ]);
    const player = runner.game.playerByClientID("human")!;
    player.addTroops(10000);
    advance(240, [
      { type: "attack", clientID: "human", targetID: null, troops: 50000 },
    ]);
    expect({
      phase: advance(1).phase,
      tiles: player.numTilesOwned(),
      troops: player.troops(),
      attacks: player.outgoingAttacks().length,
    }).toMatchObject({ phase: 2 });
    expect(advance(160).phase).toBe(2);
    runner.tutorialCommand({ phase: 2, action: "ratio", value: 0.2 });
    runner.tutorialCommand({ phase: 2, action: "ratio", value: 0.4 });
    expect(advance(1).phase).toBe(3);
  });
  it("does not count pause as training and ignores stale commands", async () => {
    const { runner, advance } = await mission();
    advance(3, [
      { type: "spawn", clientID: "human", tile: runner.game.ref(145, 285) },
    ]);
    const before = advance(1);
    runner.game.setPaused(true);
    expect(advance(50).elapsedTicks).toBe(before.elapsedTicks);
    runner.tutorialCommand({ phase: 99, action: "skip" });
    expect(advance(1).skipped).toBe(false);
    runner.tutorialCommand({ phase: before.phase, action: "skip" });
    expect(advance(1).skipped).toBe(true);
    expect(advance(1).elapsedTicks).toBe(before.elapsedTicks);
  });
});
