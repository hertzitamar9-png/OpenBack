import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { MatchmakingService } from "../../src/server/MatchmakingService";

describe("MatchmakingService", () => {
  beforeEach(() => {
    process.env.API_KEY = "matchmaking-test-key";
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
    const queue = (
      service as unknown as {
        queue: Array<{
          publicId: string;
          elo: number;
          ws: typeof a;
          joinedAt: number;
        }>;
      }
    ).queue;
    queue.push(
      { publicId: "player-a", elo: 1000, ws: a, joinedAt: 1 },
      { publicId: "player-b", elo: 1000, ws: b, joinedAt: 2 },
    );

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
    const queue = (
      service as unknown as {
        queue: Array<{
          publicId: string;
          elo: number;
          ws: (typeof sockets)[number];
          joinedAt: number;
        }>;
      }
    ).queue;
    queue.push(
      ...sockets.map((ws, index) => ({
        publicId: `player-${index}`,
        elo: 1000,
        ws,
        joinedAt: index,
      })),
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
});
