import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/core/Schemas", async () => {
  const actual = (await vi.importActual("../../src/core/Schemas")) as any;
  return {
    ...actual,
    GameStartInfoSchema: {
      safeParse: (data: any) => ({ success: true, data }),
    },
    ServerPrestartMessageSchema: {
      safeParse: (data: any) => ({ success: true, data }),
    },
  };
});

import { GameEnv } from "../../src/core/configuration/Config";
import { GameType } from "../../src/core/game/Game";
import { Client } from "../../src/server/Client";
import { GameServer } from "../../src/server/GameServer";
import { ServerEnv } from "../../src/server/ServerEnv";
import { testGameConfig } from "../util/Wire";

/**
 * A host who reconnects must still be the host.
 *
 * Two ways they stopped being one, both reported as "I can't start the game
 * and it doesn't show me in the lobby". The server resolves the host through
 * persistentID -> clientID, so anything that drops that entry silently demotes
 * them: their start press is refused as a non-creator intent, the lobby names
 * no creator, and the grace timer reads the gap as the host having left and
 * closes the lobby on everyone still in it.
 */

const HOST_PID = "host-persistent-id";

function makeMockWs() {
  const handlers: Record<string, (...args: any[]) => any> = {};
  return {
    on: (event: string, handler: (...args: any[]) => any) => {
      handlers[event] = handler;
    },
    removeAllListeners: () => {},
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    trigger: (event: string, ...args: any[]) => handlers[event]?.(...args),
  };
}

function makeClient(clientID: string, persistentID: string) {
  const ws = makeMockWs();
  const client = new Client(
    clientID,
    persistentID,
    null,
    null,
    undefined,
    "127.0.0.1",
    "TestUser",
    null,
    ws as any,
    undefined,
    undefined,
    [],
  );
  return { client, ws };
}

describe("a host who reconnects is still the host", () => {
  let logger: any;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = {
      child: vi.fn().mockReturnThis(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  const makeGame = () =>
    new GameServer(
      "test-game",
      logger,
      Date.now(),
      testGameConfig({ gameType: GameType.Private }),
      HOST_PID,
    );

  const creatorOf = (game: GameServer) => game.gameInfo().lobbyCreatorClientID;

  it("names the host as the lobby creator", () => {
    const game = makeGame();
    const { client } = makeClient("host-1", HOST_PID);
    expect(game.joinClient(client)).toBe("joined");
    expect(creatorOf(game)).toBe("host-1");
  });

  it("keeps the host when the replaced socket's close arrives late", () => {
    // The order that broke it: the old connection is already gone but the
    // server has not been told, the host reconnects on a fresh clientID, and
    // only then does the dead socket's close event land.
    const game = makeGame();
    const first = makeClient("host-1", HOST_PID);
    expect(game.joinClient(first.client)).toBe("joined");

    const second = makeClient("host-2", HOST_PID);
    expect(game.joinClient(second.client)).toBe("joined");
    expect(creatorOf(game)).toBe("host-2");

    first.ws.trigger("close");

    expect(creatorOf(game)).toBe("host-2");
    expect((game.gameInfo().clients ?? []).map((c) => c.clientID)).toContain(
      "host-2",
    );
  });

  it("does not close the lobby when the late close looks like the host leaving", () => {
    const game = makeGame();
    const first = makeClient("host-1", HOST_PID);
    game.joinClient(first.client);
    const guest = makeClient("guest-1", "guest-persistent-id");
    game.joinClient(guest.client);

    const second = makeClient("host-2", HOST_PID);
    game.joinClient(second.client);
    first.ws.trigger("close");

    // The grace timer fires long after; the host is present the whole time.
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(creatorOf(game)).toBe("host-2");
    expect(game.numClients()).toBe(2);
  });

  it("still clears the mapping when the host really does leave", () => {
    // The guard must not turn a genuine disconnect into a phantom host.
    const game = makeGame();
    const { client, ws } = makeClient("host-1", HOST_PID);
    game.joinClient(client);

    ws.trigger("close");

    expect(creatorOf(game)).toBeUndefined();
    expect(game.numClients()).toBe(0);
  });

  it("does not bar the host from their own lobby when their session is replaced", () => {
    // Production evicts a second connection from the same account. The
    // eviction is of the player's own superseded socket, so barring the
    // account locked the host out of the lobby they were sitting in -- and
    // out of being its host, which is resolved through the same list.
    vi.spyOn(ServerEnv, "env").mockReturnValue(GameEnv.Prod);
    const game = makeGame();
    const first = makeClient("host-1", HOST_PID);
    expect(game.joinClient(first.client)).toBe("joined");

    const second = makeClient("host-2", HOST_PID);
    expect(game.joinClient(second.client)).toBe("joined");

    expect(first.ws.close).toHaveBeenCalled();
    expect(creatorOf(game)).toBe("host-2");

    // And a later reconnect is still let in, rather than refused as kicked.
    const third = makeClient("host-3", HOST_PID);
    expect(game.joinClient(third.client)).toBe("joined");
    expect(creatorOf(game)).toBe("host-3");
  });

  it("still bars a player the host actually kicked", () => {
    const game = makeGame();
    game.joinClient(makeClient("host-1", HOST_PID).client);
    const guest = makeClient("guest-1", "guest-persistent-id");
    game.joinClient(guest.client);

    game.kickClient("guest-1", "kick_reason.kicked_by_host");

    const returning = makeClient("guest-2", "guest-persistent-id");
    expect(game.joinClient(returning.client)).toBe("kicked");
  });
});
