// @vitest-environment node

import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { base64urlToUuid } from "../../src/core/Base64";
import { MapPlaylist } from "../../src/server/MapPlaylist";

const authDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "openback-auth-"));
process.env.AUTH_DATA_DIR = authDataDir;
process.env.GAME_ENV = "dev";
process.env.DOMAIN = "localhost";
process.env.API_KEY = "auth-account-test-key";

let server: http.Server;
let origin: string;
let calculateObChange: typeof import("../../src/server/auth/AuthServer").calculateObChange;
let recordRankedResult: typeof import("../../src/server/auth/AuthServer").recordRankedResult;

beforeAll(async () => {
  const auth = await import("../../src/server/auth/AuthServer");
  calculateObChange = auth.calculateObChange;
  recordRankedResult = auth.recordRankedResult;
  const app = express();
  app.use(express.json());
  app.use(auth.authRouter());
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

async function postJson(pathname: string, body: unknown, cookie?: string) {
  return fetch(`${origin}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("email account lifecycle", () => {
  test("calculates OB changes from both players' ratings", () => {
    expect(calculateObChange(100, 100, 40, true)).toBe(20);
    expect(calculateObChange(10_000, 0, 40, true)).toBe(1);
    expect(calculateObChange(0, 10_000, 40, true)).toBe(40);
    expect(calculateObChange(10_000, 0, 40, false)).toBe(40);
  });

  test("claims an anonymous profile when login email is not registered", async () => {
    const email = `claim-${Date.now()}@example.com`;
    const refresh = await fetch(`${origin}/auth/refresh`, { method: "POST" });
    const refreshBody = (await refresh.json()) as { jwt: string };
    const cookie = refresh.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    const profileResponse = await fetch(`${origin}/users/@me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshBody.jwt}`,
      },
      body: JSON.stringify({
        displayName: "Remembered Player",
        bio: "Kept while claiming the account",
        bannerColor: "#2457a7",
        selectedFlag: "country:il",
        selectedCosmetic: "pattern:hexagon",
      }),
    });
    expect(profileResponse.status).toBe(200);
    const anonymousProfile = (await profileResponse.json()) as {
      player: { publicId: string };
    };

    const loginCodeResponse = await postJson(
      "/auth/request-code",
      { email, mode: "login" },
      cookie,
    );
    expect(loginCodeResponse.status).toBe(200);
    const loginCode = (await loginCodeResponse.json()) as { devCode: string };

    const verified = await postJson(
      "/auth/verify-code",
      { email, code: loginCode.devCode, mode: "login" },
      cookie,
    );
    expect(verified.status).toBe(200);
    const verifiedBody = (await verified.json()) as { jwt: string };

    const claimedProfile = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${verifiedBody.jwt}` },
    }).then((response) => response.json());
    expect(claimedProfile).toMatchObject({
      user: {
        email,
        displayName: "Remembered Player",
        bio: "Kept while claiming the account",
        bannerColor: "#2457a7",
        selectedFlag: "country:il",
        selectedCosmetic: "pattern:hexagon",
      },
      player: {
        publicId: anonymousProfile.player.publicId,
      },
    });
    // Keeping the same public ID is what preserves the relational data stored
    // against the player: clans, friends, currency, Elo, and match history.
    expect(claimedProfile.player.publicId).toBe(
      anonymousProfile.player.publicId,
    );
  });

  test("separates sign-up from login, restores data, and deletes permanently", async () => {
    const email = `account-${Date.now()}@example.com`;

    const missingLogin = await postJson("/auth/request-code", {
      email,
      mode: "login",
    });
    expect(missingLogin.status).toBe(200);
    await expect(missingLogin.json()).resolves.toMatchObject({
      ok: false,
      error: "not_registered",
      nextAction: "signup",
    });

    const signUpCodeResponse = await postJson("/auth/request-code", {
      email,
      mode: "signup",
    });
    expect(signUpCodeResponse.status).toBe(200);
    const signUpCode = (await signUpCodeResponse.json()) as {
      devCode: string;
    };

    const verified = await postJson("/auth/verify-code", {
      email,
      code: signUpCode.devCode,
      mode: "signup",
    });
    const verifiedText = await verified.text();
    expect(verified.status, verifiedText).toBe(200);
    const verifiedBody = JSON.parse(verifiedText) as { jwt: string };
    const firstCookie = verified.headers.get("set-cookie")?.split(";")[0];
    expect(firstCookie).toBeTruthy();

    const duplicateSignUp = await postJson("/auth/request-code", {
      email,
      mode: "signup",
    });
    expect(duplicateSignUp.status).toBe(200);
    await expect(duplicateSignUp.json()).resolves.toMatchObject({
      ok: false,
      error: "account_exists",
      nextAction: "login",
    });

    const profileResponse = await fetch(`${origin}/users/@me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${verifiedBody.jwt}`,
      },
      body: JSON.stringify({
        displayName: "Saved General",
        bio: "Public strategy profile",
        bannerColor: "#2457a7",
        selectedFlag: "country:il",
        selectedCosmetic: "pattern:hexagon",
      }),
    });
    expect(profileResponse.status).toBe(200);
    const savedProfile = (await profileResponse.json()) as {
      player: { publicId: string };
    };
    const publicProfile = await fetch(
      `${origin}/player/${savedProfile.player.publicId}`,
    );
    expect(publicProfile.status).toBe(200);
    const publicProfileBody = await publicProfile.json();
    expect(publicProfileBody).toMatchObject({
      displayName: "Saved General",
      bio: "Public strategy profile",
      bannerColor: "#2457a7",
      selectedFlag: "country:il",
      selectedCosmetic: "pattern:hexagon",
    });
    expect(publicProfileBody).not.toHaveProperty("email");

    const jwtPayload = JSON.parse(
      Buffer.from(verifiedBody.jwt.split(".")[1], "base64url").toString("utf8"),
    ) as { sub: string };
    const now = Date.now();
    const gameRecord = {
      info: {
        gameID: "HISTORY1",
        lobbyCreatedAt: now - 65_000,
        lobbyFillTime: 5_000,
        config: new MapPlaylist().get1v1Config(() => 0),
        players: [
          {
            clientID: "CLIENT01",
            username: "Saved General",
            clanTag: null,
            persistentID: base64urlToUuid(jwtPayload.sub),
            stats: undefined,
          },
        ],
        start: now - 60_000,
        end: now,
        duration: 60,
        num_turns: 0,
        winner: ["player", "CLIENT01"],
      },
      version: "v0.0.2",
      gitCommit: "DEV",
      subdomain: "test",
      domain: "localhost",
      turns: [],
    };
    const archived = await fetch(`${origin}/game/HISTORY1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "auth-account-test-key",
      },
      body: JSON.stringify(gameRecord),
    });
    expect(archived.status, await archived.text()).toBe(200);

    const duplicateArchive = await fetch(`${origin}/game/HISTORY1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "auth-account-test-key",
      },
      body: JSON.stringify(gameRecord),
    });
    expect(duplicateArchive.status, await duplicateArchive.text()).toBe(200);

    const rewardedProfile = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${verifiedBody.jwt}` },
    });
    await expect(rewardedProfile.json()).resolves.toMatchObject({
      player: { currency: { soft: 200 } },
    });

    const history = await fetch(
      `${origin}/public/player/${savedProfile.player.publicId}/games`,
    );
    expect(history.status).toBe(200);
    await expect(history.json()).resolves.toMatchObject({
      results: [
        {
          gameId: "HISTORY1",
          username: "Saved General",
          result: "victory",
          durationSeconds: 60,
        },
      ],
      nextCursor: null,
    });
    const archivedRecord = await fetch(`${origin}/game/HISTORY1`);
    expect(archivedRecord.status).toBe(200);
    await expect(archivedRecord.json()).resolves.toMatchObject({
      info: { gameID: "HISTORY1" },
    });

    const underfilledRecord = {
      ...gameRecord,
      info: {
        ...gameRecord.info,
        gameID: "UNDER001",
        config: { ...gameRecord.info.config, maxPlayers: 10 },
      },
    };
    const underfilledArchive = await fetch(`${origin}/game/UNDER001`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "auth-account-test-key",
      },
      body: JSON.stringify(underfilledRecord),
    });
    expect(underfilledArchive.status, await underfilledArchive.text()).toBe(
      200,
    );

    const unpaidUnderfilledProfile = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${verifiedBody.jwt}` },
    });
    await expect(unpaidUnderfilledProfile.json()).resolves.toMatchObject({
      player: { currency: { soft: 200 } },
    });

    const opponentRefresh = await fetch(`${origin}/auth/refresh`, {
      method: "POST",
    });
    const opponentBody = (await opponentRefresh.json()) as { jwt: string };
    const opponentPayload = JSON.parse(
      Buffer.from(opponentBody.jwt.split(".")[1], "base64url").toString("utf8"),
    ) as { sub: string };
    const opponentPersistentId = base64urlToUuid(opponentPayload.sub);
    for (let game = 0; game < 6; game++) {
      expect(
        recordRankedResult(
          base64urlToUuid(jwtPayload.sub),
          opponentPersistentId,
        ),
      ).toBe(true);
    }

    const obRewardedProfile = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${verifiedBody.jwt}` },
    });
    await expect(obRewardedProfile.json()).resolves.toMatchObject({
      player: {
        currency: { soft: 800 },
        leaderboard: { oneVone: { elo: expect.any(Number) } },
      },
    });

    const loggedOut = await postJson("/auth/logout", {}, firstCookie);
    expect(loggedOut.status).toBe(200);

    const loginCodeResponse = await postJson("/auth/request-code", {
      email,
      mode: "login",
    });
    const loginCode = (await loginCodeResponse.json()) as { devCode: string };
    const loggedIn = await postJson("/auth/verify-code", {
      email,
      code: loginCode.devCode,
      mode: "login",
    });
    const loggedInBody = (await loggedIn.json()) as { jwt: string };

    const restored = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${loggedInBody.jwt}` },
    });
    await expect(restored.json()).resolves.toMatchObject({
      user: {
        email,
        displayName: "Saved General",
        bio: "Public strategy profile",
        bannerColor: "#2457a7",
        selectedFlag: "country:il",
        selectedCosmetic: "pattern:hexagon",
      },
    });

    const deleted = await fetch(`${origin}/auth/account`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loggedInBody.jwt}`,
      },
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    expect(deleted.status).toBe(200);

    const deletedLogin = await postJson("/auth/request-code", {
      email,
      mode: "login",
    });
    expect(deletedLogin.status).toBe(200);
    await expect(deletedLogin.json()).resolves.toMatchObject({
      ok: false,
      error: "not_registered",
      nextAction: "signup",
    });
  });
});
