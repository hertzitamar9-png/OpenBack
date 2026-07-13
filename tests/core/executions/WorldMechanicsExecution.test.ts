import { describe, expect, test } from "vitest";
import { WorldMechanicsExecution } from "../../../src/core/execution/WorldMechanicsExecution";
import { PlayerInfo, PlayerType } from "../../../src/core/game/Game";
import {
  GameUpdateType,
  WorldEventKind,
} from "../../../src/core/game/GameUpdates";
import { setup } from "../../util/Setup";

describe("WorldMechanicsExecution", () => {
  test("spawns several neutral strategic objectives far from players", async () => {
    const game = await setup(
      "big_plains",
      { worldMechanics: { strategicObjectives: true } },
      [new PlayerInfo("player", PlayerType.Human, "client", "player")],
    );
    const player = game.player("player");
    const spawn = game.ref(20, 20);
    player.setSpawnTile(spawn);
    player.conquer(spawn);

    game.addExecution(new WorldMechanicsExecution(12345));
    game.executeNextTick();
    const updates = game.executeNextTick();
    const objectives = updates[GameUpdateType.WorldEvent].filter(
      (event) => event.kind === "objective_spawn",
    );

    expect(objectives.length).toBeGreaterThanOrEqual(3);
    expect(
      objectives.every(
        (event) =>
          game.ownerID(event.tile) === 0 &&
          game.manhattanDist(event.tile, spawn) > 40,
      ),
    ).toBe(true);
  });

  test("natural disasters emit one of six real event types", async () => {
    const game = await setup("big_plains", {
      worldMechanics: { naturalDisasters: true },
    });
    game.addExecution(new WorldMechanicsExecution(9876));
    const disasters = new Set<WorldEventKind>([
      "earthquake",
      "tsunami",
      "tornado",
      "wildfire",
      "meteor",
      "drought",
    ]);
    let emitted = false;
    for (let i = 0; i <= 1_200; i++) {
      const updates = game.executeNextTick();
      emitted ||= updates[GameUpdateType.WorldEvent].some((event) =>
        disasters.has(event.kind),
      );
    }
    expect(emitted).toBe(true);
  });
});
