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
let calculateObGain: typeof import("../../src/server/auth/AuthServer").calculateObGain;
let calculateObLoss: typeof import("../../src/server/auth/AuthServer").calculateObLoss;
let recordRankedResult: typeof import("../../src/server/auth/AuthServer").recordRankedResult;

beforeAll(async () => {
  const auth = await import("../../src/server/auth/AuthServer");
  calculateObGain = auth.calculateObGain;
  calculateObLoss = auth.calculateObLoss;
  recordRankedResult = auth.recordRankedResult;
  const app = express();
  app.set("trust proxy", 1);
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
  test("stores profile pictures and first-death state on the signed-in account", async () => {
    const email = `presentation-${Date.now()}@example.com`;
    const requested = await postJson("/auth/request-code", {
      email,
      mode: "signup",
    });
    const { devCode } = (await requested.json()) as { devCode: string };
    const verified = await postJson("/auth/verify-code", {
      email,
      code: devCode,
      mode: "signup",
    });
    const { jwt } = (await verified.json()) as { jwt: string };
    const authorization = `Bearer ${jwt}`;
    const bytes = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x08, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
      0x38, 0x20,
    ]);

    const upload = await fetch(`${origin}/users/@me/profile-picture`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify({
        dataUrl: `data:image/webp;base64,${bytes.toString("base64")}`,
      }),
    });
    expect(upload.status).toBe(200);
    const uploaded = (await upload.json()) as {
      user: { profilePictureUrl: string; deathTutorialSeen: boolean };
    };
    expect(uploaded.user.profilePictureUrl).toMatch(
      /^\/profile-images\/.+\?v=1$/,
    );
    expect(uploaded.user.deathTutorialSeen).toBe(false);

    const image = await fetch(`${origin}${uploaded.user.profilePictureUrl}`);
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toContain("image/webp");
    expect(image.headers.get("cache-control")).toContain("immutable");
    expect(Buffer.from(await image.arrayBuffer())).toEqual(bytes);

    const marked = await fetch(`${origin}/users/@me/death-tutorial-seen`, {
      method: "POST",
      headers: { Authorization: authorization },
    });
    expect(marked.status).toBe(200);
    await expect(marked.json()).resolves.toEqual({ deathTutorialSeen: true });

    const me = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: authorization },
    });
    await expect(me.json()).resolves.toMatchObject({
      user: {
        profilePictureUrl: uploaded.user.profilePictureUrl,
        deathTutorialSeen: true,
      },
    });
  });

  test("reports whether a purchase email already has an account", async () => {
    const email = `purchase-status-${Date.now()}@example.com`;
    const before = await postJson("/purchase/account-status", { email });
    expect(before.status).toBe(200);
    await expect(before.json()).resolves.toEqual({ exists: false });

    const codeResponse = await postJson("/auth/request-code", {
      email,
      mode: "signup",
    });
    const { devCode } = (await codeResponse.json()) as { devCode: string };
    const verified = await postJson("/auth/verify-code", {
      email,
      code: devCode,
      mode: "signup",
    });
    expect(verified.status).toBe(200);

    const after = await postJson("/purchase/account-status", {
      email: email.toUpperCase(),
    });
    expect(after.status).toBe(200);
    await expect(after.json()).resolves.toEqual({ exists: true });
  });

  test("grants the owner email open access and infinite Store currency", async () => {
    const email = "hertzitamar9@gmail.com";
    const codeResponse = await postJson("/auth/request-code", {
      email,
      mode: "signup",
    });
    const codeBody = (await codeResponse.json()) as {
      devCode?: string;
      error?: string;
    };

    let jwt: string;
    if (codeBody.devCode) {
      const verified = await postJson("/auth/verify-code", {
        email,
        code: codeBody.devCode,
        mode: "signup",
      });
      jwt = ((await verified.json()) as { jwt: string }).jwt;
    } else {
      const loginCodeResponse = await postJson("/auth/request-code", {
        email,
        mode: "login",
      });
      const loginCode = (await loginCodeResponse.json()) as {
        devCode: string;
      };
      const verified = await postJson("/auth/verify-code", {
        email,
        code: loginCode.devCode,
        mode: "login",
      });
      jwt = ((await verified.json()) as { jwt: string }).jwt;
    }

    const me = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(me.status).toBe(200);
    await expect(me.json()).resolves.toMatchObject({
      user: { email },
      player: {
        lifetimeAccess: true,
        infiniteGold: false,
        analyticsAccess: true,
        currency: {
          soft: Number.MAX_SAFE_INTEGER,
          hard: Number.MAX_SAFE_INTEGER,
        },
      },
    });

    const analytics = await fetch(`${origin}/owner/analytics`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    expect(analytics.status).toBe(200);
    expect(analytics.headers.get("cache-control")).toContain("no-store");
    const analyticsBody = (await analytics.json()) as Record<string, unknown>;
    expect(analyticsBody).toMatchObject({
      measuredAt: expect.any(String),
      totals: {
        onlinePlayers: expect.any(Number),
        registeredPlayers: expect.any(Number),
        completedMatches: expect.any(Number),
        playerGameSessions: expect.any(Number),
        playersWithGames: expect.any(Number),
        totalPlaySeconds: expect.any(Number),
        returningPlayers: expect.any(Number),
      },
      activePlayers: {
        day: expect.any(Number),
        week: expect.any(Number),
        month: expect.any(Number),
      },
      gameTypes: expect.any(Array),
      gameModes: expect.any(Array),
      experiences: expect.any(Array),
      players: expect.any(Array),
    });
    const players = analyticsBody.players as Array<Record<string, unknown>>;
    expect(players[0]).toMatchObject({
      email: expect.stringContaining("@"),
      selectedFlag: null,
      approximateCountry: null,
      selectedCosmetic: null,
      clans: expect.any(Array),
      hasProfilePicture: expect.any(Boolean),
      losses: expect.any(Number),
      incompleteGames: expect.any(Number),
      averageGameSeconds: expect.any(Number),
      modeBreakdown: expect.any(Array),
      typeBreakdown: expect.any(Array),
      experienceBreakdown: expect.any(Array),
      mapBreakdown: expect.any(Array),
    });
    expect(JSON.stringify(analyticsBody)).not.toContain("persistentId");
    expect(JSON.stringify(analyticsBody)).not.toContain("openback_session");
  });

  test("publishes last-online state but keeps owner analytics private", async () => {
    const email = `presence-${Date.now()}@example.com`;
    const requested = await postJson("/auth/request-code", {
      email,
      mode: "signup",
    });
    const { devCode } = (await requested.json()) as { devCode: string };
    const verified = await postJson("/auth/verify-code", {
      email,
      code: devCode,
      mode: "signup",
    });
    const auth = (await verified.json()) as { jwt: string };
    const me = await fetch(`${origin}/users/@me`, {
      headers: {
        Authorization: `Bearer ${auth.jwt}`,
        "X-Forwarded-For": "8.8.8.8",
      },
    });
    const userMe = (await me.json()) as {
      player: { publicId: string; analyticsAccess?: boolean };
    };
    expect(userMe.player.analyticsAccess).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 600));
    const persistedText = fs.readFileSync(
      path.join(authDataDir, "openback-auth.json"),
      "utf8",
    );
    const persisted = JSON.parse(persistedText) as {
      users: Array<{
        publicId: string;
        approximateCountry?: string;
        countryFirstSeenAt?: string;
        countryLastSeenAt?: string;
      }>;
    };
    expect(
      persisted.users.find(
        (candidate) => candidate.publicId === userMe.player.publicId,
      ),
    ).toMatchObject({
      approximateCountry: "US",
      countryFirstSeenAt: expect.any(String),
      countryLastSeenAt: expect.any(String),
    });
    expect(persistedText).not.toContain("8.8.8.8");

    const profile = await fetch(
      `${origin}/public/player/${userMe.player.publicId}`,
    );
    expect(profile.status).toBe(200);
    await expect(profile.json()).resolves.toMatchObject({
      publicId: userMe.player.publicId,
      online: false,
      lastSeenAt: expect.any(String),
    });

    const forbidden = await fetch(`${origin}/owner/analytics`, {
      headers: { Authorization: `Bearer ${auth.jwt}` },
    });
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({ error: "owner_only" });
  });

  test("requires an email account before starting checkout", async () => {
    const refresh = await fetch(`${origin}/auth/refresh`, { method: "POST" });
    const { jwt } = (await refresh.json()) as { jwt: string };
    const response = await fetch(`${origin}/purchase/paypal/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: "{}",
    });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "email_account_required",
    });
  });

  test("publishes privacy-safe aggregate platform counts", async () => {
    const response = await fetch(`${origin}/public/platform-stats`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const stats = (await response.json()) as Record<string, unknown>;
    expect(stats).toMatchObject({
      onlinePlayers: expect.any(Number),
      onlinePlayersExcludingOwner: expect.any(Number),
      everPlayers: expect.any(Number),
      everPlayersExcludingOwner: expect.any(Number),
      completedMatches: expect.any(Number),
      playersWithCompletedMatches: expect.any(Number),
      measuredAt: expect.any(String),
    });
    expect(stats).not.toHaveProperty("email");
  });

  test("calculates OB changes from both players' ratings", () => {
    expect(calculateObGain(100, 100)).toBe(50);
    expect(calculateObGain(10_000, 100)).toBe(10);
    expect(calculateObGain(100, 10_000)).toBe(500);
    expect(calculateObLoss(500, 100)).toBe(45);
    expect(calculateObLoss(10_000, 100)).toBe(1000);
    expect(calculateObLoss(100, 10_000)).toBe(1);
  });

  test("claims an anonymous profile when signing up, and refuses to log in an unregistered email", async () => {
    const email = `claim-${Date.now()}@example.com`;
    const refresh = await fetch(`${origin}/auth/refresh`, { method: "POST" });
    const refreshBody = (await refresh.json()) as { jwt: string };
    const cookie = refresh.headers.get("set-cookie")?.split(";")[0];
    expect(cookie).toBeTruthy();

    const namelessProfile = await fetch(`${origin}/users/@me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshBody.jwt}`,
      },
      body: JSON.stringify({ bio: "Missing required name" }),
    });
    expect(namelessProfile.status).toBe(400);

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

    // Log in means log in: an address that never signed up is refused and
    // pointed at sign-up, rather than quietly becoming an account.
    const loginCodeResponse = await postJson(
      "/auth/request-code",
      { email, mode: "login" },
      cookie,
    );
    expect(loginCodeResponse.status).toBe(200);
    expect(await loginCodeResponse.json()).toMatchObject({
      ok: false,
      error: "not_registered",
      nextAction: "signup",
    });

    // Signing up still claims the guest account, so nothing played as a guest
    // is lost.
    const signupCodeResponse = await postJson(
      "/auth/request-code",
      { email, mode: "signup" },
      cookie,
    );
    expect(signupCodeResponse.status).toBe(200);
    const loginCode = (await signupCodeResponse.json()) as { devCode: string };

    const verified = await postJson(
      "/auth/verify-code",
      { email, code: loginCode.devCode, mode: "signup" },
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
        config: {
          ...new MapPlaylist().get1v1Config(() => 0),
          nations: 400,
        },
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
        config: {
          ...gameRecord.info.config,
          gameMap: "World",
          gameMapSize: "Normal",
          nations: 1,
        },
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

    const soloRecord = {
      ...underfilledRecord,
      info: {
        ...underfilledRecord.info,
        gameID: "SOLO0001",
        config: {
          ...underfilledRecord.info.config,
          gameType: "Singleplayer",
          rankedType: undefined,
          rankedTeams: undefined,
        },
      },
    };
    const soloArchive = await fetch(`${origin}/game/SOLO0001`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "auth-account-test-key",
      },
      body: JSON.stringify(soloRecord),
    });
    expect(soloArchive.status, await soloArchive.text()).toBe(200);

    const unpaidSoloProfile = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${verifiedBody.jwt}` },
    });
    await expect(unpaidSoloProfile.json()).resolves.toMatchObject({
      player: { currency: { soft: 200 } },
    });

    const eligibleSoloRecord = {
      ...soloRecord,
      info: {
        ...soloRecord.info,
        gameID: "SOLO0002",
        config: { ...soloRecord.info.config, nations: 400 },
      },
    };
    const eligibleSoloArchive = await fetch(`${origin}/game/SOLO0002`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "auth-account-test-key",
      },
      body: JSON.stringify(eligibleSoloRecord),
    });
    expect(eligibleSoloArchive.status, await eligibleSoloArchive.text()).toBe(
      200,
    );

    const paidEligibleSoloProfile = await fetch(`${origin}/users/@me`, {
      headers: { Authorization: `Bearer ${verifiedBody.jwt}` },
    });
    await expect(paidEligibleSoloProfile.json()).resolves.toMatchObject({
      player: { currency: { soft: 400 } },
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
        currency: { soft: 1600 },
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
