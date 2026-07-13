import WebSocket from "ws";

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

function percentile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[
    Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
  ];
}

async function measureTurnCadence(
  socket: WebSocket,
  turns: number,
): Promise<TurnCadence> {
  const receivedAt: number[] = [];
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () =>
        reject(
          new Error(`Timed out after receiving ${receivedAt.length} turns`),
        ),
      30_000,
    );
    const onMessage = (data: WebSocket.RawData) => {
      const message = JSON.parse(data.toString()) as { type?: string };
      if (message.type !== "turn") return;
      receivedAt.push(performance.now());
      if (receivedAt.length < turns) return;
      clearTimeout(timeout);
      socket.off("message", onMessage);
      resolve();
    };
    socket.on("message", onMessage);
  });
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
  const sockets = playerTokens.map(() => new WebSocket(socketUrl));

  try {
    await Promise.all(
      sockets.map(
        (socket, index) =>
          new Promise<void>((resolve, reject) => {
            socket.once("error", reject);
            socket.once("open", () => {
              socket.send(
                JSON.stringify({
                  type: "join",
                  token: playerTokens[index],
                  gameID: game.gameID,
                  username: `SmokePlayer${index + 1}`,
                  clanTag: null,
                  cosmetics: {},
                  turnstileToken,
                }),
              );
              resolve();
            });
          }),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 750));
    const gameInfoResponse = await fetch(
      `${baseUrl}/${game.workerPath}/api/game/${game.gameID}`,
    );
    const gameInfo = (await gameInfoResponse.json()) as GameInfo;
    const players = gameInfo.clients.map((client) => client.username);
    if (players.length !== 2) {
      throw new Error(`Expected 2 connected players, found ${players.length}`);
    }

    const cadencePromise = measureTurnCadence(sockets[0], 100);
    sockets[0].send(
      JSON.stringify({
        type: "intent",
        intent: { type: "toggle_game_start_timer" },
      }),
    );
    const cadence = await cadencePromise;

    console.log(
      JSON.stringify(
        {
          gameID: game.gameID,
          workerPath: game.workerPath,
          connectedPlayers: players,
          clientCount: players.length,
          turnCadence: cadence,
        },
        null,
        2,
      ),
    );
  } finally {
    sockets.forEach((socket) => socket.close(1000));
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
