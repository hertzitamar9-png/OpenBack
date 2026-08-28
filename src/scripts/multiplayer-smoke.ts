import WebSocket from "ws";
import type { ZbContext } from "../../zbin";
import type { ClientMessage, ServerMessage } from "../core/Schemas";
import {
  createGameWireContext,
  decodeServerMessage,
  encodeClientMessage,
} from "../core/ZbinWire";

const baseUrl = process.env.OPENBACK_URL ?? "http://localhost:9000";
const turnstileToken =
  process.env.OPENBACK_TURNSTILE_TOKEN ?? "openback-smoke-test-token";

interface CreatedGame {
  gameID: string;
  workerPath: string;
}

interface GameClient {
  username: string;
}

interface GameInfo {
  clients: GameClient[];
}

interface TurnCadence {
  turns: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
  gapsOver200Ms: number;
}

interface SmokeClient {
  socket: WebSocket;
  context: ZbContext | null;
  binaryFramesReceived: number;
  textFramesReceived: number;
  turnTimes: number[];
  roster: string[];
  errors: string[];
}

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  ];
}

function cadence(receivedAt: number[]): TurnCadence {
  const intervals = receivedAt
    .slice(1)
    .map((time, index) => time - receivedAt[index]);
  return {
    turns: receivedAt.length,
    meanMs: intervals.reduce((sum, value) => sum + value, 0) / intervals.length,
    p95Ms: percentile(intervals, 0.95),
    maxMs: Math.max(...intervals),
    gapsOver200Ms: intervals.filter((value) => value > 200).length,
  };
}

function send(client: SmokeClient, message: ClientMessage): void {
  client.socket.send(encodeClientMessage(message, client.context ?? undefined));
}

function receive(client: SmokeClient, message: ServerMessage): void {
  if (message.type === "start") {
    client.context = createGameWireContext(message.gameStartInfo.players);
    client.roster = message.gameStartInfo.players.map(
      (player) => player.clientID,
    );
  } else if (message.type === "turn") {
    client.turnTimes.push(performance.now());
  } else if (message.type === "error") {
    client.errors.push(message.error);
  }
}

function createSmokeClient(socketUrl: string): SmokeClient {
  const client: SmokeClient = {
    socket: new WebSocket(socketUrl),
    context: null,
    binaryFramesReceived: 0,
    textFramesReceived: 0,
    turnTimes: [],
    roster: [],
    errors: [],
  };
  client.socket.on("message", (data, isBinary) => {
    if (!isBinary) {
      client.textFramesReceived++;
      return;
    }
    client.binaryFramesReceived++;
    try {
      receive(
        client,
        decodeServerMessage(
          new Uint8Array(data as Buffer),
          client.context ?? undefined,
        ),
      );
    } catch (error) {
      client.errors.push(String(error));
    }
  });
  return client;
}

async function waitFor(
  predicate: () => boolean,
  description: string,
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function main() {
  const playerTokens = await Promise.all(
    [1, 2].map(async () => {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Could not authenticate player: ${response.status}`);
      }
      const { jwt } = (await response.json()) as { jwt: string };
      return jwt;
    }),
  );
  const response = await fetch(`${baseUrl}/api/create_game`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${playerTokens[0]}`,
    },
    body: "{}",
  });
  const game = (await response.json()) as CreatedGame;
  if (!response.ok) {
    throw new Error(`Could not create multiplayer lobby: ${response.status}`);
  }

  const socketUrl = `${baseUrl.replace(/^http/, "ws")}/${game.workerPath}`;
  const clients = playerTokens.map(() => createSmokeClient(socketUrl));

  try {
    await Promise.all(
      clients.map(
        (client, index) =>
          new Promise<void>((resolve, reject) => {
            client.socket.once("error", reject);
            client.socket.once("open", () => {
              send(client, {
                type: "join",
                token: playerTokens[index],
                gameID: game.gameID,
                username: `SmokePlayer${index + 1}`,
                clanTag: null,
                cosmetics: {},
                turnstileToken,
              });
              resolve();
            });
          }),
      ),
    );

    await waitFor(
      () => clients.every((client) => client.binaryFramesReceived > 0),
      "binary lobby frames",
    );
    const gameInfoResponse = await fetch(
      `${baseUrl}/${game.workerPath}/api/game/${game.gameID}`,
    );
    const gameInfo = (await gameInfoResponse.json()) as GameInfo;
    const players = gameInfo.clients.map((client) => client.username);
    if (players.length !== 2) {
      throw new Error(`Expected 2 connected players, found ${players.length}`);
    }

    send(clients[0], {
      type: "intent",
      intent: { type: "toggle_game_start_timer" },
    });
    await waitFor(
      () => clients.every((client) => client.turnTimes.length >= 100),
      "100 binary turns on both clients",
    );

    for (const [index, client] of clients.entries()) {
      if (client.errors.length > 0) {
        throw new Error(
          `Client ${index + 1} decode/server errors: ${client.errors.join("; ")}`,
        );
      }
      if (client.textFramesReceived !== 0) {
        throw new Error(`Client ${index + 1} received text WebSocket frames`);
      }
      if (client.binaryFramesReceived === 0 || client.turnTimes.length < 100) {
        throw new Error(
          `Client ${index + 1} did not receive the binary turn stream`,
        );
      }
      if (client.roster.length !== 2) {
        throw new Error(
          `Client ${index + 1} did not receive the two-player roster`,
        );
      }
    }

    console.log(
      JSON.stringify(
        {
          gameID: game.gameID,
          workerPath: game.workerPath,
          connectedPlayers: players,
          clientCount: players.length,
          clients: clients.map((client) => ({
            roster: client.roster,
            binaryFramesReceived: client.binaryFramesReceived,
            textFramesReceived: client.textFramesReceived,
            turnCadence: cadence(client.turnTimes),
          })),
        },
        null,
        2,
      ),
    );
  } finally {
    clients.forEach((client) => client.socket.close(1000));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
