import { describe, expect, it, vi } from "vitest";
import { WorkerMessageSchema } from "../../src/server/IPCBridgeSchema";
import { MasterLobbyService } from "../../src/server/MasterLobbyService";

type Handler = (raw: unknown) => void;

// A cluster Worker stand-in that just captures the message handler, so a test
// can push IPC reports through the real parsing path.
function fakeWorker(): { worker: never; send: (raw: unknown) => void } {
  let handler: Handler = () => {};
  const worker = {
    on: (event: string, fn: Handler) => {
      if (event === "message") handler = fn;
    },
    send: vi.fn(),
  };
  return {
    worker: worker as never,
    send: (raw: unknown) => handler(raw),
  };
}

function service(): MasterLobbyService {
  const log = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  };
  return new MasterLobbyService({} as never, log as never);
}

describe("live match counts", () => {
  it("sums matches in progress across workers", () => {
    const svc = service();
    const w0 = fakeWorker();
    const w1 = fakeWorker();
    svc.registerWorker(0, w0.worker);
    svc.registerWorker(1, w1.worker);

    expect(svc.liveCounts()).toEqual({ matches: 0, players: 0 });

    w0.send({
      type: "lobbyList",
      lobbies: [],
      runningGames: 2,
      activeClients: 9,
    });
    w1.send({
      type: "lobbyList",
      lobbies: [],
      runningGames: 1,
      activeClients: 4,
    });

    expect(svc.liveCounts()).toEqual({ matches: 3, players: 13 });
  });

  it("drops a worker's contribution when it goes away", () => {
    const svc = service();
    const w0 = fakeWorker();
    svc.registerWorker(0, w0.worker);
    w0.send({
      type: "lobbyList",
      lobbies: [],
      runningGames: 5,
      activeClients: 20,
    });
    expect(svc.liveCounts().matches).toBe(5);

    svc.removeWorker(0);
    // A dead worker's matches are gone with it; leaving them counted would
    // hold every future deploy open.
    expect(svc.liveCounts()).toEqual({ matches: 0, players: 0 });
  });

  it("treats a report from an older worker as idle rather than blocking", () => {
    const svc = service();
    const w0 = fakeWorker();
    svc.registerWorker(0, w0.worker);
    // No counts on the message at all: still a valid report.
    w0.send({ type: "lobbyList", lobbies: [] });
    expect(svc.liveCounts()).toEqual({ matches: 0, players: 0 });
  });

  it("accepts the counts through the wire schema", () => {
    const parsed = WorkerMessageSchema.safeParse({
      type: "lobbyList",
      lobbies: [],
      runningGames: 3,
      activeClients: 11,
    });
    expect(parsed.success).toBe(true);
  });
});
