import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { MapPlaylist } from "../../src/server/MapPlaylist";
import { MatchmakingService } from "../../src/server/MatchmakingService";

describe("MatchmakingService", () => {
  beforeEach(() => {
    process.env.API_KEY = "matchmaking-test-key";
  });

  const queued = <T extends { readyState: number }>(
    publicId: string,
    elo: number,
    ws: T,
    joinedAt: number,
  ) => ({
    players: [{ publicId, elo, displayName: publicId, ws }],
    teamSize: 1 as const,
    joinedAt,
    preferences: {},
  });

  it("sends the same assignment before closing both matched sockets", () => {
    const events: string[] = [];
    const socket = (name: string) => ({
      readyState: WebSocket.OPEN,
      send: vi.fn((message: string) => events.push(`${name}:send:${message}`)),
      close: vi.fn(() => events.push(`${name}:close`)),
    });
    const a = socket("a");
    const b = socket("b");
    const service = new MatchmakingService({ info: vi.fn() } as never);
    const queue = (service as unknown as { queue: ReturnType<typeof queued>[] })
      .queue;
    queue.push(queued("player-a", 1000, a, 1), queued("player-b", 1000, b, 2));

    const json = vi.fn();
    service.handleCheckin(
      {
        header: () => "matchmaking-test-key",
        body: { gameId: "shared-game" },
      } as never,
      { json, status: vi.fn() } as never,
    );

    const assignment = JSON.stringify({
      type: "match-assignment",
      gameId: "shared-game",
    });
    expect(events).toEqual([
      `a:send:${assignment}`,
      "a:close",
      `b:send:${assignment}`,
      "b:close",
    ]);
    expect(queue).toHaveLength(0);
    expect(json).toHaveBeenCalledWith({ assignment: true });
  });

  it("creates separate 1v1 games for multiple queued pairs", () => {
    const assignments = new Map<string, string>();
    const socket = (name: string) => ({
      readyState: WebSocket.OPEN,
      send: vi.fn((message: string) => {
        const data = JSON.parse(message) as { gameId: string };
        assignments.set(name, data.gameId);
      }),
      close: vi.fn(),
    });
    const sockets = [socket("a"), socket("b"), socket("c"), socket("d")];
    const service = new MatchmakingService({ info: vi.fn() } as never);
    const queue = (service as unknown as { queue: ReturnType<typeof queued>[] })
      .queue;
    queue.push(
      ...sockets.map((ws, index) => queued(`player-${index}`, 1000, ws, index)),
    );

    const checkIn = (gameId: string) => {
      const json = vi.fn();
      service.handleCheckin(
        {
          header: () => "matchmaking-test-key",
          body: { gameId },
        } as never,
        { json, status: vi.fn() } as never,
      );
      expect(json).toHaveBeenCalledWith({ assignment: true });
    };

    checkIn("game-one");
    expect(queue).toHaveLength(2);
    checkIn("game-two");

    expect(queue).toHaveLength(0);
    expect(
      [...assignments.values()].filter((id) => id === "game-one"),
    ).toHaveLength(2);
    expect(
      [...assignments.values()].filter((id) => id === "game-two"),
    ).toHaveLength(2);
    expect(sockets.every((ws) => ws.close.mock.calls.length === 1)).toBe(true);
  });

  it("immediately pairs the only two players regardless of Elo difference", () => {
    const socket = () => ({
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
    });
    const low = socket();
    const high = socket();
    const service = new MatchmakingService({ info: vi.fn() } as never);
    const queue = (service as unknown as { queue: ReturnType<typeof queued>[] })
      .queue;
    queue.push(
      queued("low", 100, low, Date.now()),
      queued("high", 3000, high, Date.now() + 1),
    );

    const json = vi.fn();
    service.handleCheckin(
      {
        header: () => "matchmaking-test-key",
        body: { gameId: "instant-game" },
      } as never,
      { json, status: vi.fn() } as never,
    );

    expect(json).toHaveBeenCalledWith({ assignment: true });
    expect(low.send).toHaveBeenCalledOnce();
    expect(high.send).toHaveBeenCalledOnce();
    expect(queue).toHaveLength(0);
  });

  it("pairs the oldest player with the closest Elo among a larger queue", () => {
    const socket = () => ({
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
    });
    const oldest = socket();
    const far = socket();
    const closest = socket();
    const other = socket();
    const service = new MatchmakingService({ info: vi.fn() } as never);
    const queue = (service as unknown as { queue: ReturnType<typeof queued>[] })
      .queue;
    queue.push(
      queued("oldest", 1000, oldest, 1),
      queued("far", 2000, far, 2),
      queued("closest", 1030, closest, 3),
      queued("other", 1100, other, 4),
    );

    const json = vi.fn();
    service.handleCheckin(
      {
        header: () => "matchmaking-test-key",
        body: { gameId: "closest-game" },
      } as never,
      { json, status: vi.fn() } as never,
    );

    expect(oldest.send).toHaveBeenCalledOnce();
    expect(closest.send).toHaveBeenCalledOnce();
    expect(far.send).not.toHaveBeenCalled();
    expect(other.send).not.toHaveBeenCalled();
    expect(queue.map((entry) => entry.players[0].publicId)).toEqual([
      "far",
      "other",
    ]);
  });

  it("returns centrally generated randomized rules to the assigned worker", () => {
    const socket = () => ({
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
    });
    const config = new MapPlaylist().get1v1Config(() => 0);
    const service = new MatchmakingService(
      { info: vi.fn() } as never,
      () => config,
    );
    const queue = (service as unknown as { queue: ReturnType<typeof queued>[] })
      .queue;
    queue.push(queued("a", 1000, socket(), 1), queued("b", 1000, socket(), 2));
    const json = vi.fn();

    service.handleCheckin(
      {
        header: () => "matchmaking-test-key",
        body: { gameId: "random-rules-game" },
      } as never,
      { json, status: vi.fn() } as never,
    );

    expect(json).toHaveBeenCalledWith({ assignment: true, gameConfig: config });
  });

  it("assigns complete 4v4 parties and preserves their team order", () => {
    const socket = () => ({
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
    });
    const createConfig = vi.fn(() => ({ ranked: true }));
    const service = new MatchmakingService(
      { info: vi.fn() } as never,
      createConfig as never,
    );
    const makeParty = (prefix: string, joinedAt: number) => ({
      players: Array.from({ length: 4 }, (_, index) => ({
        publicId: `${prefix}-${index}`,
        displayName: `${prefix}-${index}`,
        elo: 1000 + index,
        ws: socket(),
      })),
      teamSize: 4 as const,
      joinedAt,
      preferences: { bots: 200, nations: 100 },
      partyCode: prefix,
    });
    const a = makeParty("a", 1);
    const b = makeParty("b", 2);
    const queue = (service as unknown as { queue: Array<typeof a | typeof b> })
      .queue;
    queue.push(a, b);
    const json = vi.fn();

    service.handleCheckin(
      {
        header: () => "matchmaking-test-key",
        body: { gameId: "team-game" },
      } as never,
      { json, status: vi.fn() } as never,
    );

    expect(createConfig).toHaveBeenCalledWith(
      4,
      [
        a.players.map((player) => player.publicId),
        b.players.map((player) => player.publicId),
      ],
      { bots: 200, nations: 100 },
    );
    expect(
      [...a.players, ...b.players].every(
        (p) => p.ws.send.mock.calls.length === 1,
      ),
    ).toBe(true);
    expect(queue).toHaveLength(0);
  });
});
