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

  test("announces every disaster before impact and cycles through the full catalog", async () => {
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
      "blizzard",
      "flood",
      "volcano",
      "lightning",
      "sandstorm",
      "avalanche",
      "sinkhole",
      "radiation_storm",
    ]);
    const emitted = new Set<WorldEventKind>();
    const warned = new Set<WorldEventKind>();
    let firstDisasterTick: number | null = null;
    for (let i = 0; i <= 5_500; i++) {
      const updates = game.executeNextTick();
      for (const event of updates[GameUpdateType.WorldEvent]) {
        if (event.kind === "disaster_warning" && event.warnedKind) {
          warned.add(event.warnedKind);
          continue;
        }
        if (!disasters.has(event.kind)) continue;
        expect(warned.has(event.kind)).toBe(true);
        firstDisasterTick ??= i;
        emitted.add(event.kind);
      }
    }
    expect(firstDisasterTick).not.toBeNull();
    expect(firstDisasterTick!).toBeLessThanOrEqual(125);
    expect(emitted).toEqual(disasters);
  });

  test("produces identical warnings and impacts for the same seed", async () => {
    const first = await setup("ocean_and_land", {
      worldMechanics: { naturalDisasters: true, livingWorld: true },
    });
    const second = await setup("ocean_and_land", {
      worldMechanics: { naturalDisasters: true, livingWorld: true },
    });
    first.addExecution(new WorldMechanicsExecution(445566));
    second.addExecution(new WorldMechanicsExecution(445566));
    const sequence = (game: typeof first) =>
      (game.executeNextTick()[GameUpdateType.WorldEvent] ?? []).map(
        (event) => ({
          kind: event.kind,
          tile: event.tile,
          radius: event.radius,
          warnedKind: event.warnedKind,
        }),
      );
    for (let tick = 0; tick < 900; tick++) {
      expect(sequence(first)).toEqual(sequence(second));
    }
    expect(first.terrainBuffer()).toEqual(second.terrainBuffer());
  });

  test("freezes narrow water only after warning and later thaws it", async () => {
    const game = await setup("ocean_and_land", {
      worldMechanics: { livingWorld: true },
    });
    game.addExecution(new WorldMechanicsExecution(778899));
    const original = Uint8Array.from(game.terrainBuffer());
    let warned = false;
    let froze = false;
    let thawed = false;
    for (let tick = 0; tick < 660; tick++) {
      const updates = game.executeNextTick()[GameUpdateType.WorldEvent];
      for (const event of updates) {
        if (
          event.kind === "disaster_warning" &&
          event.warnedKind === "winter_freeze"
        )
          warned = true;
        if (event.kind === "winter_freeze") {
          expect(warned).toBe(true);
          froze = true;
          expect(game.terrainBuffer()).not.toEqual(original);
        }
        if (event.kind === "spring_thaw") thawed = true;
      }
    }
    expect(froze).toBe(true);
    expect(thawed).toBe(true);
    expect(Array.from(game.terrainBuffer())).toEqual(Array.from(original));
  });

  test("temporarily covers low coastline at 3D night and restores it by day", async () => {
    const game = await setup("ocean_and_land", {
      worldMechanics: { threeDMode: true },
    });
    game.addExecution(new WorldMechanicsExecution(112233));
    const original = Uint8Array.from(game.terrainBuffer());
    for (let tick = 0; tick < 520; tick++) game.executeNextTick();
    expect(game.terrainBuffer()).not.toEqual(original);
    for (let tick = 520; tick < 980; tick++) game.executeNextTick();
    expect(Array.from(game.terrainBuffer())).toEqual(Array.from(original));
  });
});
