import crypto from "crypto";
import express from "express";
import fs from "fs";
import { jwtVerify, SignJWT } from "jose";
import nodemailer from "nodemailer";
import { Pool } from "pg";
import { z } from "zod";
import { UserMeResponse, UserMeResponseSchema } from "../../core/ApiSchemas";
import { base64urlToUuid, uuidToBase64url } from "../../core/Base64";
import { GameEnv } from "../../core/configuration/Config";
import { generateID } from "../../core/Util";
import { ServerEnv } from "../ServerEnv";
import { ensureKeys, getPrivateKey, getPublicJwk } from "./keys";

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
  displayName?: string;
  bio?: string;
  bannerColor?: string;
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

type ClanRole = "leader" | "officer" | "member";
interface StoredClanMember {
  publicId: string;
  role: ClanRole;
  joinedAt: string;
}
interface StoredClanRequest {
  publicId: string;
  createdAt: string;
}
interface StoredClanBan {
  publicId: string;
  bannedBy: string;
  reason: string | null;
  createdAt: string;
}
interface StoredClan {
  tag: string;
  name: string;
  description: string;
  isOpen: boolean;
  createdAt: string;
  members: StoredClanMember[];
  requests: StoredClanRequest[];
  bans: StoredClanBan[];
}

// ---- Persistence ----------------------------------------------------------
// DATABASE_URL is the production path: a single transactional JSON document
// keeps accounts, sessions, profiles, and clans together. The JSON file is a
// local-development fallback only; Render's filesystem is intentionally not
// treated as durable storage.
const DATA_DIR = process.env.AUTH_DATA_DIR ?? "/tmp";
const DATA_FILE = `${DATA_DIR}/openback-auth.json`;
interface PersistShape {
  users: StoredUser[];
  sessions: Record<string, Session>;
  clans?: StoredClan[];
}
const usersByEmail = new Map<string, StoredUser>();
const usersByPid = new Map<string, StoredUser>();
const sessions = new Map<string, Session>();
const codes = new Map<string, PendingCode>();
const clansByTag = new Map<string, StoredClan>();
const databaseUrl = process.env.DATABASE_URL;
const database = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost")
        ? undefined
        : { rejectUnauthorized: false },
    })
  : null;

function hydrate(raw: PersistShape) {
  usersByEmail.clear();
  usersByPid.clear();
  sessions.clear();
  clansByTag.clear();
  for (const u of raw.users ?? []) {
    usersByEmail.set(u.email?.toLowerCase() ?? u.persistentId, u);
    usersByPid.set(u.persistentId, u);
  }
  for (const [k, v] of Object.entries(raw.sessions ?? {})) sessions.set(k, v);
  for (const clan of raw.clans ?? []) {
    clansByTag.set(clan.tag.toUpperCase(), clan);
  }
}

async function loadPersisted() {
  try {
    if (database) {
      await database.query(`
        CREATE TABLE IF NOT EXISTS openback_state (
          id INTEGER PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      const result = await database.query<{ data: PersistShape }>(
        "SELECT data FROM openback_state WHERE id = 1",
      );
      if (result.rows[0]?.data) hydrate(result.rows[0].data);
      return;
    }
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as PersistShape;
    hydrate(raw);
  } catch (error) {
    console.error("[auth] failed to load persistent state", error);
    throw error;
  }
}
let saveTimer: NodeJS.Timeout | null = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      const data: PersistShape = {
        users: [...usersByPid.values()],
        sessions: Object.fromEntries(sessions),
        clans: [...clansByTag.values()],
      };
      if (database) {
        await database.query(
          `INSERT INTO openback_state (id, data, updated_at)
           VALUES (1, $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE
           SET data = EXCLUDED.data, updated_at = NOW()`,
          [JSON.stringify(data)],
        );
      } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data));
      }
    } catch (error) {
      console.error("[auth] failed to save persistent state", error);
    }
  }, 500);
}
const persistenceReady = loadPersisted();

// ---- Origin & Google config -----------------------------------------------
export function authOrigin(): string {
  if (process.env.AUTH_ORIGIN) return process.env.AUTH_ORIGIN;
  if (ServerEnv.env() === GameEnv.Dev) return "http://localhost:9000";
  return `https://${ServerEnv.jwtAudienceRaw()}`;
}

export function googleEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
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
  const clans = [...clansByTag.values()].flatMap((clan) => {
    const member = clan.members.find((m) => m.publicId === user.publicId);
    return member
      ? [
          {
            tag: clan.tag,
            name: clan.name,
            role: member.role,
            joinedAt: member.joinedAt,
            memberCount: clan.members.length,
          },
        ]
      : [];
  });
  const clanRequests = [...clansByTag.values()].flatMap((clan) => {
    const request = clan.requests.find((r) => r.publicId === user.publicId);
    return request
      ? [{ tag: clan.tag, name: clan.name, createdAt: request.createdAt }]
      : [];
  });
  return UserMeResponseSchema.parse({
    user: {
      email: user.email ?? undefined,
      displayName: user.displayName,
      bio: user.bio,
      bannerColor: user.bannerColor,
    },
    player: {
      publicId: user.publicId,
      adfree: false,
      achievements: { singleplayerMap: [] },
      clans,
      clanRequests,
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

async function userFromBearer(
  req: express.Request,
): Promise<StoredUser | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  await ensureKeys();
  try {
    const { payload } = await jwtVerify(auth.slice(7), getPublicJwk(), {
      algorithms: ["EdDSA"],
      issuer: authOrigin(),
      audience: authOrigin(),
    });
    if (!payload.sub) return null;
    return usersByPid.get(base64urlToUuid(payload.sub)) ?? null;
  } catch {
    return null;
  }
}

function clanInfo(clan: StoredClan) {
  return {
    name: clan.name,
    tag: clan.tag,
    description: clan.description,
    isOpen: clan.isOpen,
    createdAt: clan.createdAt,
    memberCount: clan.members.length,
  };
}

function clanForRequest(req: express.Request): StoredClan | null {
  const rawTag = req.params.tag;
  const tag = (Array.isArray(rawTag) ? rawTag[0] : rawTag)?.toUpperCase();
  return tag ? (clansByTag.get(tag) ?? null) : null;
}

function memberFor(clan: StoredClan, user: StoredUser) {
  return clan.members.find((member) => member.publicId === user.publicId);
}

function canManageClan(clan: StoredClan, user: StoredUser): boolean {
  const member = memberFor(clan, user);
  return member?.role === "leader" || member?.role === "officer";
}

// ---- Email ----------------------------------------------------------------
const RequestCodeSchema = z.object({ email: z.string().email() });

export async function sendCodeEmail(
  email: string,
  code: string,
): Promise<string | null> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
  if (brevoApiKey && brevoSenderEmail) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: brevoSenderEmail,
          name: process.env.BREVO_SENDER_NAME ?? "OpenBack",
        },
        to: [{ email }],
        subject: "Your OpenBack login code",
        textContent: `Your OpenBack login code is: ${code}\n\nIt expires in 10 minutes.`,
        htmlContent:
          `<p>Your OpenBack login code is:</p>` +
          `<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p>` +
          `<p>It expires in 10 minutes.</p>`,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Brevo email API returned ${response.status}`);
    }
    return null;
  }

  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`[auth] LOGIN CODE for ${email}: ${code}`);
    if (ServerEnv.env() === GameEnv.Dev) return code;
    throw new Error("No email delivery provider is configured");
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
        process.env.SMTP_FROM ??
        process.env.SMTP_USER ??
        "no-reply@openback.app",
      to: email,
      subject: "Your OpenBack login code",
      text: `Your OpenBack login code is: ${code}\n\nIt expires in 10 minutes.`,
    });
    return null;
  } catch (e) {
    console.error("[auth] failed to send email", e);
    if (ServerEnv.env() === GameEnv.Dev) return code;
    throw e;
  }
}

// ---- Routes ---------------------------------------------------------------
export function authRouter(): express.Router {
  const router = express.Router();

  router.use(async (_req, res, next) => {
    try {
      await persistenceReady;
      next();
    } catch {
      res.status(503).json({ error: "persistent_storage_unavailable" });
    }
  });

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
    codes.set(email, {
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
    });
    try {
      const devCode = await sendCodeEmail(email, code);
      res.json({ ok: true, devCode: devCode ?? undefined });
    } catch (error) {
      codes.delete(email);
      console.error(
        "[auth] could not deliver login code:",
        error instanceof Error ? error.message : error,
      );
      res.status(503).json({ error: "email_delivery_failed" });
    }
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

  // Persistent OpenBack profile customization.
  router.patch("/users/@me", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = z
      .object({
        displayName: z.string().trim().min(3).max(27).optional(),
        bio: z.string().trim().max(160).optional(),
        bannerColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_profile" });
      return;
    }
    Object.assign(user, parsed.data);
    persist();
    res.json(userMeFor(user));
  });

  // Self-contained clan API. Every browser worldwide uses this same server,
  // so tags, memberships, requests, and moderation are authoritative.
  router.post("/clans", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user || !user.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = z
      .object({
        tag: z.string().regex(/^[a-zA-Z0-9]{2,5}$/),
        name: z.string().trim().min(2).max(35),
        description: z.string().trim().max(200).default(""),
        isOpen: z.boolean().default(true),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_clan" });
      return;
    }
    const tag = parsed.data.tag.toUpperCase();
    if (clansByTag.has(tag)) {
      res.status(409).json({ error: "tag_taken" });
      return;
    }
    const now = new Date().toISOString();
    const clan: StoredClan = {
      ...parsed.data,
      tag,
      createdAt: now,
      members: [{ publicId: user.publicId, role: "leader", joinedAt: now }],
      requests: [],
      bans: [],
    };
    clansByTag.set(tag, clan);
    persist();
    res.status(201).json(clanInfo(clan));
  });

  router.get("/clans", (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search ?? "")
      .trim()
      .toLowerCase();
    const all = [...clansByTag.values()]
      .filter(
        (clan) =>
          !search ||
          clan.tag.toLowerCase().includes(search) ||
          clan.name.toLowerCase().includes(search),
      )
      .sort((a, b) => b.members.length - a.members.length);
    const start = (page - 1) * limit;
    res.json({
      results: all.slice(start, start + limit).map(clanInfo),
      total: all.length,
      page,
      limit,
    });
  });

  router.get("/public/clan/:tag/exists", (req, res) => {
    if (!clanForRequest(req)) {
      res.status(404).json({ exists: false });
      return;
    }
    res.json({ exists: true });
  });

  router.get("/reserved-clan-tags", (_req, res) => {
    res.json([...clansByTag.keys()]);
  });

  router.get("/public/clans/leaderboard", (_req, res) => {
    const now = new Date();
    res.json({
      start: new Date(now.getTime() - 30 * 86400_000).toISOString(),
      end: now.toISOString(),
      clans: [...clansByTag.values()].map((clan) => ({
        clanTag: clan.tag,
        games: 0,
        wins: 0,
        losses: 0,
        playerSessions: clan.members.length,
        weightedWins: 0,
        weightedLosses: 0,
        weightedWLRatio: 0,
      })),
    });
  });

  router.get("/clans/:tag", (req, res) => {
    const clan = clanForRequest(req);
    if (!clan) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(clanInfo(clan));
  });

  router.get("/clans/:tag/members", async (req, res) => {
    const clan = clanForRequest(req);
    if (!clan) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const start = (page - 1) * limit;
    res.json({
      results: clan.members.slice(start, start + limit),
      total: clan.members.length,
      page,
      limit,
      pendingRequests: clan.requests.length,
    });
  });

  router.post("/clans/:tag/join", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !user.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!clan) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (memberFor(clan, user)) {
      res.status(409).json({ message: "already a member" });
      return;
    }
    const banned = clan.bans.find((ban) => ban.publicId === user.publicId);
    if (banned) {
      res.status(403).json({
        code: "BANNED",
        reason: banned.reason,
      });
      return;
    }
    const now = new Date().toISOString();
    if (clan.isOpen) {
      clan.members.push({
        publicId: user.publicId,
        role: "member",
        joinedAt: now,
      });
      clan.requests = clan.requests.filter((r) => r.publicId !== user.publicId);
      persist();
      res.json({ status: "joined" });
      return;
    }
    if (clan.requests.some((r) => r.publicId === user.publicId)) {
      res.status(409).json({ message: "request already pending" });
      return;
    }
    clan.requests.push({ publicId: user.publicId, createdAt: now });
    persist();
    res.json({ status: "requested" });
  });

  router.post("/clans/:tag/leave", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const member = memberFor(clan, user);
    if (!member) {
      res.status(409).json({ error: "not_member" });
      return;
    }
    if (member.role === "leader" && clan.members.length > 1) {
      res.status(409).json({ error: "transfer_leadership_first" });
      return;
    }
    clan.members = clan.members.filter((m) => m.publicId !== user.publicId);
    if (clan.members.length === 0) clansByTag.delete(clan.tag);
    persist();
    res.json({ ok: true });
  });

  router.patch("/clans/:tag", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan || !canManageClan(clan, user)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const parsed = z
      .object({
        name: z.string().trim().min(2).max(35).optional(),
        description: z.string().trim().max(200).optional(),
        isOpen: z.boolean().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_clan" });
      return;
    }
    Object.assign(clan, parsed.data);
    persist();
    res.json(clanInfo(clan));
  });

  router.delete("/clans/:tag", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan || memberFor(clan, user)?.role !== "leader") {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    clansByTag.delete(clan.tag);
    persist();
    res.json({ ok: true });
  });

  router.get("/clans/:tag/requests", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan || !canManageClan(clan, user)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const start = (page - 1) * limit;
    res.json({
      results: clan.requests.slice(start, start + limit),
      total: clan.requests.length,
      page,
      limit,
    });
  });

  router.post("/clans/:tag/requests/withdraw", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    clan.requests = clan.requests.filter((r) => r.publicId !== user.publicId);
    persist();
    res.json({ ok: true });
  });

  for (const action of ["approve", "deny"] as const) {
    router.post(`/clans/:tag/requests/${action}`, async (req, res) => {
      const user = await userFromBearer(req);
      const clan = clanForRequest(req);
      if (!user || !clan || !canManageClan(clan, user)) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const targetPublicId = String(req.body?.targetPublicId ?? "");
      const request = clan.requests.find((r) => r.publicId === targetPublicId);
      if (!request) {
        res.status(404).json({ error: "request_not_found" });
        return;
      }
      clan.requests = clan.requests.filter(
        (r) => r.publicId !== targetPublicId,
      );
      if (action === "approve") {
        clan.members.push({
          publicId: targetPublicId,
          role: "member",
          joinedAt: new Date().toISOString(),
        });
      }
      persist();
      res.json({ ok: true });
    });
  }

  router.get("/clans/:tag/bans", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan || !canManageClan(clan, user)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    res.json({
      results: clan.bans,
      total: clan.bans.length,
      page: 1,
      limit: Math.max(20, clan.bans.length),
    });
  });

  router.get("/clans/:tag/games", async (req, res) => {
    const clan = clanForRequest(req);
    if (!clan) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ results: [], nextCursor: null });
  });

  for (const action of ["kick", "promote", "demote", "transfer"] as const) {
    router.post(`/clans/:tag/${action}`, async (req, res) => {
      const user = await userFromBearer(req);
      const clan = clanForRequest(req);
      if (!user || !clan || !canManageClan(clan, user)) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const actor = memberFor(clan, user)!;
      const targetPublicId = String(req.body?.targetPublicId ?? "");
      const target = clan.members.find((m) => m.publicId === targetPublicId);
      if (!target || target.role === "leader") {
        res.status(409).json({ error: "invalid_target" });
        return;
      }
      if (action === "kick") {
        clan.members = clan.members.filter(
          (m) => m.publicId !== targetPublicId,
        );
      } else if (action === "promote") {
        if (actor.role !== "leader") {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        target.role = "officer";
      } else if (action === "demote") {
        if (actor.role !== "leader") {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        target.role = "member";
      } else {
        if (actor.role !== "leader") {
          res.status(403).json({ error: "forbidden" });
          return;
        }
        actor.role = "member";
        target.role = "leader";
      }
      persist();
      res.json({ ok: true });
    });
  }

  router.post("/clans/:tag/ban", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan || !canManageClan(clan, user)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const targetPublicId = String(req.body?.targetPublicId ?? "");
    clan.members = clan.members.filter((m) => m.publicId !== targetPublicId);
    clan.requests = clan.requests.filter((r) => r.publicId !== targetPublicId);
    clan.bans = clan.bans.filter((b) => b.publicId !== targetPublicId);
    clan.bans.push({
      publicId: targetPublicId,
      bannedBy: user.publicId,
      reason:
        typeof req.body?.reason === "string"
          ? req.body.reason.slice(0, 200)
          : null,
      createdAt: new Date().toISOString(),
    });
    persist();
    res.json({ ok: true });
  });

  router.post("/clans/:tag/unban", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clanForRequest(req);
    if (!user || !clan || !canManageClan(clan, user)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    const targetPublicId = String(req.body?.targetPublicId ?? "");
    clan.bans = clan.bans.filter((b) => b.publicId !== targetPublicId);
    persist();
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
