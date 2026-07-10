import { jwtVerify, SignJWT } from "jose";
import crypto from "crypto";
import express from "express";
import fs from "fs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { generateID } from "../../core/Util";
import { base64urlToUuid, uuidToBase64url } from "../../core/Base64";
import {
  UserMeResponse,
  UserMeResponseSchema,
} from "../../core/ApiSchemas";
import { ServerEnv } from "../ServerEnv";
import { GameEnv } from "../../core/configuration/Config";
import { getPrivateKey, getPublicJwk, ensureKeys } from "./keys";

// ---------------------------------------------------------------------------
// Self-contained auth for OpenBack. OpenFront's auth lives in a closed-source
// Cloudflare Worker that is NOT in this repo, so this module re-implements the
// pieces the client actually depends on: an Ed25519 JWT issuer, email code
// sign-in, optional Google OAuth, a session cookie, and /users/@me.
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "openback_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // "forever"
const JWT_EXPIRES_S = 60 * 60 * 24 * 30; // 30 days, refreshed while session valid
const CODE_TTL_MS = 1000 * 60 * 10; // 10 minute magic code

interface StoredUser {
  persistentId: string;
  email: string | null;
  publicId: string;
  createdAt: number;
  googleSub?: string;
}
interface Session {
  persistentId: string;
  createdAt: number;
}
interface PendingCode {
  code: string;
  expiresAt: number;
  attempts: number;
}

// ---- Persistence (best-effort JSON file; harmless if unwritable) ----------
const DATA_DIR = process.env.AUTH_DATA_DIR ?? "/tmp";
const DATA_FILE = `${DATA_DIR}/openback-auth.json`;
interface PersistShape {
  users: StoredUser[];
  sessions: Record<string, Session>;
}
const usersByEmail = new Map<string, StoredUser>();
const usersByPid = new Map<string, StoredUser>();
const sessions = new Map<string, Session>();
const codes = new Map<string, PendingCode>();

function loadPersisted() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PersistShape;
    for (const u of raw.users ?? []) {
      usersByEmail.set(u.email?.toLowerCase() ?? u.persistentId, u);
      usersByPid.set(u.persistentId, u);
    }
    for (const [k, v] of Object.entries(raw.sessions ?? {})) {
      sessions.set(k, v);
    }
  } catch {
    /* ignore */
  }
}
let saveTimer: NodeJS.Timeout | null = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      const data: PersistShape = {
        users: [...usersByPid.values()],
        sessions: Object.fromEntries(sessions),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, 500);
}
loadPersisted();

// ---- Origin & Google config -----------------------------------------------
export function authOrigin(): string {
  if (process.env.AUTH_ORIGIN) return process.env.AUTH_ORIGIN;
  if (ServerEnv.env() === GameEnv.Dev) return "http://localhost:9000";
  return `https://${ServerEnv.jwtAudienceRaw()}`;
}

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
function googleRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ?? `${authOrigin()}/auth/google/callback`
  );
}

// ---- Helpers --------------------------------------------------------------
function getCookie(req: express.Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function userMeFor(user: StoredUser): UserMeResponse {
  return UserMeResponseSchema.parse({
    user: { email: user.email ?? undefined },
    player: {
      publicId: user.publicId,
      adfree: false,
      achievements: { singleplayerMap: [] },
      friends: [],
      subscription: null,
    },
  });
}

function findOrCreateUser(opts: {
  email?: string;
  googleSub?: string;
}): StoredUser {
  if (opts.email) {
    const existing = usersByEmail.get(opts.email.toLowerCase());
    if (existing) return existing;
  }
  if (opts.googleSub) {
    const existing = [...usersByPid.values()].find(
      (u) => u.googleSub === opts.googleSub,
    );
    if (existing) return existing;
  }
  const user: StoredUser = {
    persistentId: crypto.randomUUID(),
    email: opts.email ? opts.email.toLowerCase() : null,
    publicId: generateID(),
    createdAt: Date.now(),
    googleSub: opts.googleSub,
  };
  usersByEmail.set(user.email?.toLowerCase() ?? user.persistentId, user);
  usersByPid.set(user.persistentId, user);
  persist();
  return user;
}

async function signToken(user: StoredUser): Promise<{
  jwt: string;
  expiresIn: number;
}> {
  await ensureKeys();
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "EdDSA" })
    .setJti(crypto.randomUUID())
    .setSubject(uuidToBase64url(user.persistentId))
    .setIssuer(authOrigin())
    .setAudience(authOrigin())
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + JWT_EXPIRES_S)
    .sign(getPrivateKey());
  return { jwt, expiresIn: JWT_EXPIRES_S };
}

function newSession(user: StoredUser): string {
  const id = crypto.randomBytes(32).toString("base64url");
  sessions.set(id, { persistentId: user.persistentId, createdAt: Date.now() });
  persist();
  return id;
}

function setSessionCookie(res: express.Response, sessionId: string) {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: ServerEnv.env() !== GameEnv.Dev,
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

function userFromSession(req: express.Request): StoredUser | null {
  const cookie = getCookie(req, SESSION_COOKIE);
  if (!cookie) return null;
  const session = sessions.get(cookie);
  if (!session) return null;
  return usersByPid.get(session.persistentId) ?? null;
}

// ---- Email ----------------------------------------------------------------
const RequestCodeSchema = z.object({ email: z.string().email() });

async function sendCodeEmail(email: string, code: string): Promise<string | null> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[auth] LOGIN CODE for ${email}: ${code}`);
    return ServerEnv.env() === GameEnv.Dev ? code : null;
  }
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT ?? "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transporter.sendMail({
      from:
        process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@openback.app",
      to: email,
      subject: "Your OpenBack login code",
      text: `Your OpenBack login code is: ${code}\n\nIt expires in 10 minutes.`,
    });
    return null;
  } catch (e) {
    console.error("[auth] failed to send email", e);
    return ServerEnv.env() === GameEnv.Dev ? code : null;
  }
}

// ---- Routes ---------------------------------------------------------------
export function authRouter(): express.Router {
  const router = express.Router();

  router.get("/.well-known/jwks.json", async (_req, res) => {
    await ensureKeys();
    res.json({ keys: [getPublicJwk()] });
  });

  router.post("/auth/request-code", async (req, res) => {
    const parsed = RequestCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_email" });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const code = String(crypto.randomInt(100000, 1000000));
    codes.set(email, { code, expiresAt: Date.now() + CODE_TTL_MS, attempts: 0 });
    const devCode = await sendCodeEmail(email, code);
    res.json({ ok: true, devCode: devCode ?? undefined });
  });

  router.post("/auth/verify-code", async (req, res) => {
    const { email, code } = req.body as { email?: string; code?: string };
    if (!email || !code) {
      res.status(400).json({ error: "missing_fields" });
      return;
    }
    const pending = codes.get(email.toLowerCase());
    if (!pending || pending.expiresAt < Date.now()) {
      codes.delete(email.toLowerCase());
      res.status(400).json({ error: "code_expired" });
      return;
    }
    if (pending.attempts >= 5) {
      codes.delete(email.toLowerCase());
      res.status(429).json({ error: "too_many_attempts" });
      return;
    }
    if (pending.code !== String(code).trim()) {
      pending.attempts++;
      res.status(401).json({ error: "invalid_code" });
      return;
    }
    codes.delete(email.toLowerCase());
    const user = findOrCreateUser({ email: email.toLowerCase() });
    const sessionId = newSession(user);
    setSessionCookie(res, sessionId);
    const { jwt, expiresIn } = await signToken(user);
    res.json({ jwt, expiresIn });
  });

  // Refresh: returns a fresh JWT. With no session, creates an anonymous
  // account so guests still get a valid JWT (matches OpenFront behaviour and
  // lets unauthenticated players join in production).
  router.post("/auth/refresh", async (req, res) => {
    let user = userFromSession(req);
    if (!user) {
      user = findOrCreateUser({});
      const sessionId = newSession(user);
      setSessionCookie(res, sessionId);
    }
    const { jwt, expiresIn } = await signToken(user);
    res.json({ jwt, expiresIn });
  });

  router.post("/auth/logout", (req, res) => {
    const cookie = getCookie(req, SESSION_COOKIE);
    if (cookie) sessions.delete(cookie);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  router.post("/auth/revoke", (req, res) => {
    const cookie = getCookie(req, SESSION_COOKIE);
    if (cookie) sessions.delete(cookie);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  // Google OAuth (only functions when GOOGLE_CLIENT_ID/SECRET are set).
  router.get("/auth/google", (req, res) => {
    if (!googleEnabled()) {
      res.status(501).send("Google sign-in is not configured");
      return;
    }
    const url =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID!)}` +
      `&redirect_uri=${encodeURIComponent(googleRedirectUri())}` +
      `&response_type=code&scope=${encodeURIComponent("openid email profile")}` +
      `&state=${encodeURIComponent(req.query.state?.toString() ?? "")}`;
    res.redirect(url);
  });

  router.get("/auth/google/callback", async (req, res) => {
    const code = req.query.code?.toString();
    if (!code || !googleEnabled()) {
      res.status(400).send("Missing code or Google not configured");
      return;
    }
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: googleRedirectUri(),
          grant_type: "authorization_code",
        }),
      });
      const tokenJson = (await tokenRes.json()) as { id_token?: string };
      if (!tokenJson.id_token) {
        res.status(400).send("Google token exchange failed");
        return;
      }
      const idToken = tokenJson.id_token;
      const payload = JSON.parse(
        Buffer.from(idToken.split(".")[1], "base64").toString("utf-8"),
      ) as { sub?: string; email?: string };
      const user = findOrCreateUser({
        googleSub: payload.sub,
        email: payload.email,
      });
      const sessionId = newSession(user);
      setSessionCookie(res, sessionId);
      res.redirect("/");
    } catch (e) {
      console.error("[auth] google callback failed", e);
      res.status(500).send("Google sign-in failed");
    }
  });

  // /users/@me — used by both the browser and the game server (Worker).
  router.get("/users/@me", async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    await ensureKeys();
    try {
      const { payload } = await jwtVerify(auth.slice(7), getPublicJwk(), {
        algorithms: ["EdDSA"],
        issuer: authOrigin(),
        audience: authOrigin(),
      });
      const sub = payload.sub;
      if (!sub) {
        res.status(401).json({ error: "invalid_token" });
        return;
      }
      const pid = base64urlToUuid(sub);
      const user = usersByPid.get(pid);
      if (!user) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.json(userMeFor(user));
    } catch (e) {
      console.error(
        "[auth] /users/@me verify failed:",
        e instanceof Error ? e.message : e,
      );
      res.status(401).json({ error: "invalid_token" });
    }
  });

  return router;
}
