import { PlayerExecution } from "../../../src/core/execution/PlayerExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../../src/core/game/Game";
import { setup } from "../../util/Setup";
import { executeTicks } from "../../util/utils";

let game: Game;
let player: Player;
let otherPlayer: Player;

describe("PlayerExecution", () => {
  beforeEach(async () => {
    game = await setup(
      "big_plains",
      { infiniteGold: true, instantBuild: true },
      [
        new PlayerInfo("player", PlayerType.Human, "client_id1", "player_id"),
        new PlayerInfo("other", PlayerType.Human, "client_id2", "other_id"),
      ],
    );

    player = game.player("player_id");
    otherPlayer = game.player("other_id");

    game.addExecution(new PlayerExecution(player));
    game.addExecution(new PlayerExecution(otherPlayer));
  });

  test("DefensePost lv. 1 is destroyed when tile owner changes", () => {
    const tile = game.ref(50, 50);
    player.conquer(tile);
    const defensePost = player.buildUnit(UnitType.DefensePost, tile, {});

    game.executeNextTick();
    expect(game.unitCount(UnitType.DefensePost)).toBe(1);
    expect(defensePost.level()).toBe(1);

    otherPlayer.conquer(tile);
    executeTicks(game, 2);

    expect(game.unitCount(UnitType.DefensePost)).toBe(0);
  });

  test("DefensePost lv. 2+ is destroyed when tile owner changes", () => {
    const tile = game.ref(50, 50);
    player.conquer(tile);
    const defensePost = player.buildUnit(UnitType.DefensePost, tile, {});
    defensePost.increaseLevel();

    expect(defensePost.level()).toBe(2);
    expect(game.unitCount(UnitType.DefensePost)).toBe(2); // unitCount sums levels
    expect(player.units(UnitType.DefensePost)).toHaveLength(1);
    expect(defensePost.isActive()).toBe(true);

    otherPlayer.conquer(tile);
    executeTicks(game, 2);

    expect(game.unitCount(UnitType.DefensePost)).toBe(0);
    expect(defensePost.isActive()).toBe(false);
  });

  test("Non-DefensePost structures are transferred (not downgraded) when tile owner changes", () => {
    const tile = game.ref(50, 50);
    player.conquer(tile);
    const city = player.buildUnit(UnitType.City, tile, {});

    expect(game.unitCount(UnitType.City)).toBe(1);
    expect(city.level()).toBe(1);
    expect(city.owner()).toBe(player);
    expect(city.isActive()).toBe(true);

    otherPlayer.conquer(tile);
    executeTicks(game, 2);

    expect(game.unitCount(UnitType.City)).toBe(1);
    expect(city.level()).toBe(1);
    expect(city.owner()).toBe(otherPlayer);
    expect(city.isActive()).toBe(true);
  });

  test("war exhaustion reduces both income streams during a long war", async () => {
    const exhaustedGame = await setup(
      "big_plains",
      { infiniteGold: false, instantBuild: true },
      [
        new PlayerInfo("war", PlayerType.Human, "war_client", "war_id"),
        new PlayerInfo("peace", PlayerType.Human, "peace_client", "peace_id"),
      ],
    );
    const war = exhaustedGame.player("war_id");
    const peace = exhaustedGame.player("peace_id");
    war.conquer(exhaustedGame.ref(20, 20));
    peace.conquer(exhaustedGame.ref(80, 80));
    war.addTroops(10_000);
    peace.addTroops(10_000);
    (war as unknown as { _outgoingAttacks: object[] })._outgoingAttacks.push({});

    const warExec = new PlayerExecution(war);
    const peaceExec = new PlayerExecution(peace);
    warExec.init(exhaustedGame, 0);
    peaceExec.init(exhaustedGame, 0);
    const warGold = war.gold();
    const peaceGold = peace.gold();
    for (let tick = 1; tick <= 1_000; tick++) {
      warExec.tick(tick);
      peaceExec.tick(tick);
    }

    expect(war.gold() - warGold).toBeLessThan(peace.gold() - peaceGold);
    expect(war.troops()).toBeLessThan(peace.troops());
  });

  test("all shared controllers resolve to the same country", async () => {
    const shared = await setup(
      "big_plains",
      { infiniteGold: false },
      [
        new PlayerInfo(
          "shared",
          PlayerType.Human,
          "captain",
          "shared_id",
          false,
          null,
          [],
          ["captain", "friend1", "friend2"],
        ),
      ],
    );
    expect(shared.playerByClientID("captain")?.id()).toBe("shared_id");
    expect(shared.playerByClientID("friend1")?.id()).toBe("shared_id");
    expect(shared.playerByClientID("friend2")?.id()).toBe("shared_id");
  });
});
