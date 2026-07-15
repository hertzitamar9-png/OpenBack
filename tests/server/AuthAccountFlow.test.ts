// @vitest-environment node

import express from "express";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const authDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "openback-auth-"));
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
  test("separates sign-up from login, restores data, and deletes permanently", async () => {
    const email = `account-${Date.now()}@example.com`;

    const missingLogin = await postJson("/auth/request-code", {
      email,
      mode: "login",
    });
    expect(missingLogin.status).toBe(404);
    await expect(missingLogin.json()).resolves.toMatchObject({
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
    expect(duplicateSignUp.status).toBe(409);
    await expect(duplicateSignUp.json()).resolves.toMatchObject({
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
    expect(deletedLogin.status).toBe(404);
  });
});
