// @vitest-environment node

import express from "express";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const authDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "openback-tribes-"));
process.env.AUTH_DATA_DIR = authDataDir;
process.env.GAME_ENV = "dev";
process.env.DOMAIN = "localhost";
process.env.API_KEY = "tribe-test-key";

let server: http.Server;
let origin: string;
let jwt: string;
let publicId: string;
let closePersistence: () => Promise<void>;

beforeAll(async () => {
  const auth = await import("../../src/server/auth/AuthServer");
  closePersistence = auth.closeAuthPersistence;
  const app = express();
  app.use(express.json());
  app.use(auth.authRouter());
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  origin = `http://127.0.0.1:${address.port}`;

  const requested = await post("/auth/request-code", {
    email: "hertzitamar9@gmail.com",
    mode: "signup",
  });
  const { devCode } = (await requested.json()) as { devCode: string };
  const verified = await post("/auth/verify-code", {
    email: "hertzitamar9@gmail.com",
    mode: "signup",
    code: devCode,
  });
  jwt = ((await verified.json()) as { jwt: string }).jwt;
  const me = await authenticated("/users/@me");
  publicId = ((await me.json()) as { player: { publicId: string } }).player
    .publicId;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await closePersistence();
  fs.rmSync(authDataDir, { recursive: true, force: true });
});

function post(pathname: string, body: unknown, headers: HeadersInit = {}) {
  return fetch(`${origin}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function authenticated(pathname: string, init: RequestInit = {}) {
  return fetch(`${origin}${pathname}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${jwt}` },
  });
}

describe("complete Tribe API", () => {
  test("purchases, boosts, lists, publishes, ranks, and injects a name", async () => {
    const rename = await authenticated("/users/@me/username", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "OpenBack Commander" }),
    });
    expect(rename.status).toBe(200);

    const initial = await authenticated("/users/@me/tribe_names");
    await expect(initial.json()).resolves.toEqual({ names: [] });

    const purchase = await authenticated("/users/@me/tribe_names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "OpenBack Vanguard" }),
    });
    expect(purchase.status).toBe(201);
    const bought = (await purchase.json()) as { id: string };

    const boost = await authenticated(
      `/users/@me/tribe_names/${bought.id}/boosts`,
      { method: "POST", headers: { "Idempotency-Key": "one-click" } },
    );
    expect(boost.status).toBe(201);
    const boosted = await boost.json();
    const repeated = await authenticated(
      `/users/@me/tribe_names/${bought.id}/boosts`,
      { method: "POST", headers: { "Idempotency-Key": "one-click" } },
    );
    await expect(repeated.json()).resolves.toEqual(boosted);

    const owned = await authenticated("/users/@me/tribe_names");
    await expect(owned.json()).resolves.toMatchObject({
      names: [
        {
          id: bought.id,
          displayName: "OpenBack Vanguard",
          activeBoosts: 1,
        },
      ],
    });

    const stats = await fetch(`${origin}/public/tribe/openback%20vanguard`);
    expect(stats.status).toBe(200);
    await expect(stats.json()).resolves.toMatchObject({
      name: "OpenBack Vanguard",
      ownerPublicId: publicId,
      ownerUsername: "OpenBack Commander",
      lifetime: { gamesAppeared: 0, playerReach: 0 },
    });

    const leaderboard = await fetch(`${origin}/leaderboard/tribes?page=1`);
    await expect(leaderboard.json()).resolves.toMatchObject({
      tribes: [{ rank: 1, name: "OpenBack Vanguard", activeBoosts: 1 }],
    });

    const pool = await post(
      "/custom_tribes",
      { players: [{ clientId: "client", publicId }] },
      { "x-api-key": "tribe-test-key" },
    );
    await expect(pool.json()).resolves.toMatchObject({
      tribes: [
        {
          name: "OpenBack Vanguard",
          customTribeNameId: bought.id,
          ownerPublicId: publicId,
        },
      ],
    });
  });
});
