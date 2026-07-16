// @vitest-environment node

import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const authDataDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "openback-friends-auth-"),
);
process.env.AUTH_DATA_DIR = authDataDir;
process.env.GAME_ENV = "dev";
process.env.DOMAIN = "localhost";

let server: http.Server;
let origin: string;

beforeAll(async () => {
  const { authRouter } = await import("../../src/server/auth/AuthServer");
  const app = express();
  app.use(express.json());
  app.use(authRouter());
  server = app.listen(0, "127.0.0.1");
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

async function signUp(email: string): Promise<{
  jwt: string;
  publicId: string;
}> {
  const requested = await fetch(`${origin}/auth/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, mode: "signup" }),
  });
  const { devCode } = (await requested.json()) as { devCode: string };
  const verified = await fetch(`${origin}/auth/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, mode: "signup", code: devCode }),
  });
  const { jwt } = (await verified.json()) as { jwt: string };
  const me = await fetch(`${origin}/users/@me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const data = (await me.json()) as { player: { publicId: string } };
  return { jwt, publicId: data.player.publicId };
}

function authenticated(
  pathname: string,
  jwt: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${origin}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${jwt}`,
    },
  });
}

describe("friends API", () => {
  test("persists request, acceptance, both friend lists, and removal", async () => {
    const a = await signUp(`friends-a-${Date.now()}@example.com`);
    const b = await signUp(`friends-b-${Date.now()}@example.com`);

    const request = await authenticated(
      `/friends/requests/${b.publicId}`,
      a.jwt,
      { method: "POST" },
    );
    await expect(request.json()).resolves.toMatchObject({
      status: "requested",
    });

    const incoming = await authenticated("/friends/requests", b.jwt);
    await expect(incoming.json()).resolves.toMatchObject({
      incoming: [{ publicId: a.publicId }],
    });

    const accepted = await authenticated(
      `/friends/requests/${a.publicId}/accept`,
      b.jwt,
      { method: "POST" },
    );
    expect(accepted.status).toBe(200);

    for (const user of [a, b]) {
      const friends = await authenticated("/friends?page=1&limit=20", user.jwt);
      const body = (await friends.json()) as {
        total: number;
        results: Array<{ publicId: string }>;
      };
      expect(body.total).toBe(1);
      expect(body.results[0].publicId).toBe(
        user === a ? b.publicId : a.publicId,
      );
    }

    const removed = await authenticated(`/friends/${b.publicId}`, a.jwt, {
      method: "DELETE",
    });
    expect(removed.status).toBe(200);
    const empty = await authenticated("/friends?page=1&limit=20", b.jwt);
    await expect(empty.json()).resolves.toMatchObject({
      total: 0,
      results: [],
    });
  });
});
