// @vitest-environment node

import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { WebSocket } from "ws";

const authDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "openback-social-"));
process.env.AUTH_DATA_DIR = authDataDir;
process.env.GAME_ENV = "dev";
process.env.DOMAIN = "localhost";

let server: http.Server;
let origin: string;

beforeAll(async () => {
  const [{ authRouter }, { SocialService }] = await Promise.all([
    import("../../src/server/auth/AuthServer"),
    import("../../src/server/SocialService"),
  ]);
  const app = express();
  app.use(express.json());
  app.use(authRouter());
  server = http.createServer(app);
  new SocialService({ info: vi.fn() } as never).attach(server);
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  fs.rmSync(authDataDir, { recursive: true, force: true });
});

async function signUp(email: string) {
  const request = await fetch(`${origin}/auth/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, mode: "signup" }),
  });
  const { devCode } = (await request.json()) as { devCode: string };
  const verify = await fetch(`${origin}/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, mode: "signup", code: devCode }),
  });
  const { jwt } = (await verify.json()) as { jwt: string };
  const me = await fetch(`${origin}/users/@me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const body = (await me.json()) as { player: { publicId: string } };
  return { jwt, publicId: body.player.publicId };
}

function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) =>
    ws.once("message", (data) =>
      resolve(JSON.parse(data.toString()) as Record<string, unknown>),
    ),
  );
}

async function nextMessageOfType(
  ws: WebSocket,
  type: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const listener = (data: WebSocket.RawData) => {
      const message = JSON.parse(data.toString()) as Record<string, unknown>;
      if (message.type !== type) return;
      ws.off("message", listener);
      resolve(message);
    };
    ws.on("message", listener);
  });
}

async function connect(jwt: string): Promise<WebSocket> {
  const ws = new WebSocket(origin.replace("http", "ws") + "/social");
  await new Promise<void>((resolve) => ws.once("open", () => resolve()));
  const registered = nextMessage(ws);
  ws.send(JSON.stringify({ type: "register", jwt }));
  await expect(registered).resolves.toMatchObject({ type: "registered" });
  return ws;
}

type TestAccount = { jwt: string; publicId: string };

async function befriend(a: TestAccount, b: TestAccount): Promise<void> {
  await fetch(`${origin}/friends/requests/${b.publicId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${a.jwt}`,
    },
  });
  await fetch(`${origin}/friends/requests/${a.publicId}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${b.jwt}`,
    },
  });
}

function sendLobbyInvite(
  sender: WebSocket,
  jwt: string,
  target: string,
  lobbyId: string,
): void {
  sender.send(
    JSON.stringify({ type: "invite", jwt, target, kind: "lobby", lobbyId }),
  );
}

function closeAll(...sockets: WebSocket[]): Promise<unknown> {
  return Promise.all(
    sockets.map(
      (socket) =>
        new Promise<void>((resolve) => {
          socket.once("close", () => resolve());
          socket.close();
        }),
    ),
  );
}

describe("SocialService", () => {
  test("delivers a private lobby invite only after players become friends", async () => {
    const a = await signUp(`social-a-${Date.now()}@example.com`);
    const b = await signUp(`social-b-${Date.now()}@example.com`);
    await fetch(`${origin}/friends/requests/${b.publicId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${a.jwt}`,
      },
    });
    await fetch(`${origin}/friends/requests/${a.publicId}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${b.jwt}`,
      },
    });

    const sender = await connect(a.jwt);
    const receiver = await connect(b.jwt);
    const invitation = nextMessageOfType(receiver, "invite");
    const result = nextMessageOfType(sender, "invite_result");
    sender.send(
      JSON.stringify({
        type: "invite",
        jwt: a.jwt,
        target: b.publicId,
        kind: "lobby",
        lobbyId: "InviteGame1",
      }),
    );

    await expect(invitation).resolves.toMatchObject({
      type: "invite",
      from: a.publicId,
      kind: "lobby",
      lobbyId: "InviteGame1",
    });
    await expect(result).resolves.toMatchObject({
      type: "invite_result",
      target: b.publicId,
      delivered: true,
    });

    const rankedInvitation = nextMessageOfType(receiver, "invite");
    const rankedResult = nextMessageOfType(sender, "invite_result");
    sender.send(
      JSON.stringify({
        type: "invite",
        jwt: a.jwt,
        target: b.publicId,
        kind: "ranked_party",
        partyCode: "A1B2C3",
        teamSize: 4,
      }),
    );
    await expect(rankedInvitation).resolves.toMatchObject({
      type: "invite",
      kind: "ranked_party",
      partyCode: "A1B2C3",
      teamSize: 4,
    });
    await expect(rankedResult).resolves.toMatchObject({
      type: "invite_result",
      delivered: true,
    });
    await closeAll(sender, receiver);
  });

  test("a second invite to a different lobby reaches the friend", async () => {
    // Reported as "the first invite works, then he doesn't see the message
    // get sent". An unanswered invitation stays pending, and the second
    // invite was treated as a repeat of it purely because both were lobby
    // invites -- the sender was told it had been delivered while nothing was
    // sent, and the only invitation the friend still held pointed at a lobby
    // that had already finished.
    const a = await signUp(`social-c-${Date.now()}@example.com`);
    const b = await signUp(`social-d-${Date.now()}@example.com`);
    await befriend(a, b);

    const sender = await connect(a.jwt);
    const receiver = await connect(b.jwt);

    const firstInvite = nextMessageOfType(receiver, "invite");
    sendLobbyInvite(sender, a.jwt, b.publicId, "FirstGame");
    const first = await firstInvite;
    expect(first).toMatchObject({ kind: "lobby", lobbyId: "FirstGame" });

    // The friend never answers it -- the popup times out, or they simply
    // ignore it. The host starts a second game and invites them again.
    const secondInvite = nextMessageOfType(receiver, "invite");
    const secondResult = nextMessageOfType(sender, "invite_result");
    const removal = nextMessageOfType(receiver, "invite_removed");
    sendLobbyInvite(sender, a.jwt, b.publicId, "SecondGame");

    await expect(secondInvite).resolves.toMatchObject({
      kind: "lobby",
      lobbyId: "SecondGame",
    });
    await expect(secondResult).resolves.toMatchObject({ delivered: true });
    // And the dead one is withdrawn, so accepting from the friends list
    // cannot send them to a lobby the host has left.
    await expect(removal).resolves.toMatchObject({ inviteId: first.id });

    const pending = nextMessageOfType(receiver, "pending_invites");
    receiver.send(JSON.stringify({ type: "party_state_request", jwt: b.jwt }));
    const lobbies = ((await pending).invites as Array<{ payload: unknown }>)
      .map((invite) => invite.payload as { kind: string; lobbyId?: string })
      .filter((payload) => payload.kind === "lobby")
      .map((payload) => payload.lobbyId);
    expect(lobbies).toEqual(["SecondGame"]);

    await closeAll(sender, receiver);
  });

  test("re-inviting to the same lobby sends it again rather than only claiming success", async () => {
    // Same lobby, so it is the same invitation and must keep its id -- but the
    // friend may have dismissed the popup or reconnected since, and the
    // pending list is what they read from.
    const a = await signUp(`social-e-${Date.now()}@example.com`);
    const b = await signUp(`social-f-${Date.now()}@example.com`);
    await befriend(a, b);

    const sender = await connect(a.jwt);
    const receiver = await connect(b.jwt);

    const firstInvite = nextMessageOfType(receiver, "invite");
    sendLobbyInvite(sender, a.jwt, b.publicId, "SameGame1");
    const first = await firstInvite;

    const repeat = nextMessageOfType(receiver, "invite");
    sendLobbyInvite(sender, a.jwt, b.publicId, "SameGame1");
    await expect(repeat).resolves.toMatchObject({
      id: first.id,
      lobbyId: "SameGame1",
    });

    await closeAll(sender, receiver);
  });
});
