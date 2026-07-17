import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameMode, GameType } from "../../src/core/game/Game";
import { Client } from "../../src/server/Client";
import { GameServer, IntentActor } from "../../src/server/GameServer";

function client(clientID: string, persistentID: string): Client {
  const ws = {
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
  };
  return new Client(
    clientID,
    persistentID,
    null,
    null,
    undefined,
    "127.0.0.1",
    `Player_${clientID}`,
    null,
    ws as any,
    undefined,
    undefined,
    [],
  );
}

describe("GameServer team selection", () => {
  let game: GameServer;

  beforeEach(() => {
    vi.useFakeTimers();
    const logger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    game = new GameServer(
      "test-game",
      logger as any,
      Date.now(),
      {
        gameType: GameType.Private,
        gameMode: GameMode.Team,
        playerTeams: 2,
      } as any,
      "owner-pid",
    );
    game.joinClient(client("owner", "owner-pid"));
    game.joinClient(client("player", "player-pid"));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const actor = (clientID: string, isLobbyCreator = false): IntentActor => ({
    clientID,
    isLobbyCreator,
    isAdmin: false,
    isAdminBot: false,
  });

  it("lets players select their own team", () => {
    expect(
      game.handleIntent(
        { type: "set_player_team", targetClientID: "player", team: "Blue" },
        actor("player"),
      ).status,
    ).toBe(200);
    expect(
      game.gameInfo("player").clients?.find((c) => c.clientID === "player")
        ?.selectedTeam,
    ).toBe("Blue");
  });

  it("lets the party owner edit another player's team", () => {
    expect(
      game.handleIntent(
        { type: "set_player_team", targetClientID: "player", team: "Red" },
        actor("owner", true),
      ).status,
    ).toBe(200);
  });

  it("prevents regular players from editing opponents", () => {
    expect(
      game.handleIntent(
        { type: "set_player_team", targetClientID: "owner", team: "Blue" },
        actor("player"),
      ).status,
    ).toBe(403);
  });
});
