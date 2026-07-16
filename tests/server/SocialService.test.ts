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

async function connect(jwt: string): Promise<WebSocket> {
  const ws = new WebSocket(origin.replace("http", "ws") + "/social");
  await new Promise<void>((resolve) => ws.once("open", () => resolve()));
  const registered = nextMessage(ws);
  ws.send(JSON.stringify({ type: "register", jwt }));
  await expect(registered).resolves.toMatchObject({ type: "registered" });
  return ws;
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
    const invitation = nextMessage(receiver);
    const result = nextMessage(sender);
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

    const rankedInvitation = nextMessage(receiver);
    const rankedResult = nextMessage(sender);
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
    sender.close();
    receiver.close();
  });
});
