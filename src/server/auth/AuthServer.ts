import express from "express";
import { jwtVerify, SignJWT } from "jose";
import crypto from "node:crypto";
import fs from "node:fs";
import nodemailer from "nodemailer";
import { Pool } from "pg";
import cosmeticsJson from "resources/cosmetics.json" with { type: "json" };
import { z } from "zod";
import {
  PlayerGameModeFilter,
  PlayerGameTypeFilter,
  PlayerProfileSchema,
  PublicPlayerGame,
  RankedLeaderboardResponseSchema,
  UserMeResponse,
  UserMeResponseSchema,
} from "../../core/ApiSchemas";
import { base64urlToUuid, uuidToBase64url } from "../../core/Base64";
import { GameEnv } from "../../core/configuration/Config";
import { CosmeticsSchema } from "../../core/CosmeticSchemas";
import {
  GameMapSize,
  GameMode,
  HumansVsNations,
  RankedType,
} from "../../core/game/Game";
import { GameRecord, GameRecordSchema } from "../../core/Schemas";
import { generateID, replacer } from "../../core/Util";
import { getMapNationCount } from "../MapLandTiles";
import { ServerEnv } from "../ServerEnv";
import { requireDurableAuthStorage } from "./AuthPersistence";
import { ensureKeys, getPrivateKey, getPublicJwk } from "./keys";

// ---------------------------------------------------------------------------
// Self-contained auth for OpenBack. OpenFront's auth lives in a closed-source
// Cloudflare Worker that is NOT in this repo, so this module re-implements the
// pieces the client actually depends on: an Ed25519 JWT issuer, email code
// sign-in, optional Google OAuth, a session cookie, and /users/@me.
// ---------------------------------------------------------------------------

const SESSION_COOKIE = "openback_session";
// Browsers cap persistent cookies, so renew the maximum practical lifetime on
// every authenticated refresh. Active players remain signed in until logout.
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 400;
const JWT_EXPIRES_S = 60 * 60 * 24 * 30; // 30 days, refreshed while session valid
const CODE_TTL_MS = 1000 * 60 * 10; // 10 minute magic code
const MATCH_COMPLETION_REWARD = 100;
const MATCH_VICTORY_BONUS = 100;

interface StoredUser {
  persistentId: string;
  email: string | null;
  publicId: string;
  createdAt: number;
  googleSub?: string;
  displayName?: string;
  bio?: string;
  bannerColor?: string;
  selectedFlag?: string;
  selectedCosmetic?: string;
  // Ranked 1v1 progression.
  elo?: number;
  peakElo?: number;
  rankedWins?: number;
  rankedLosses?: number;
  rankedObEarned?: number;
  obMilestones?: number[];
  // Shop wallet + owned cosmetics (flare strings, e.g. "pattern:foo").
  currencySoft?: number;
  currencyHard?: number;
  flares?: string[];
}
interface Session {
  persistentId: string;
  createdAt: number;
}
interface PendingCode {
  code: string;
  expiresAt: number;
  attempts: number;
  mode: EmailAuthMode;
}

type EmailAuthMode = "signup" | "login";

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
  chatMessages?: StoredChatMessage[];
}

interface StoredChatMessage {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
}

interface StoredConversation {
  id: string;
  kind: "direct" | "group";
  name?: string;
  createdBy: string;
  members: string[];
  createdAt: string;
  messages: StoredChatMessage[];
}

// ---- Persistence ----------------------------------------------------------
// DATABASE_URL is the production path: a single transactional JSON document
// keeps accounts, sessions, profiles, and clans together. The JSON file is a
// local-development fallback only; Render's filesystem is intentionally not
// treated as durable storage.
const DATA_DIR = process.env.AUTH_DATA_DIR ?? "/tmp";
const DATA_FILE = `${DATA_DIR}/openback-auth.json`;
const GAME_RECORD_DIR = `${DATA_DIR}/openback-games`;
interface PersistShape {
  users: StoredUser[];
  sessions: Record<string, Session>;
  clans?: StoredClan[];
  friendships?: StoredFriendship[];
  friendRequests?: StoredFriendRequest[];
  conversations?: StoredConversation[];
  playerGames?: StoredPlayerGame[];
}
interface StoredPlayerGame extends PublicPlayerGame {
  publicId: string;
}
interface StoredFriendship {
  a: string;
  b: string;
  createdAt: string;
}
interface StoredFriendRequest {
  from: string;
  to: string;
  createdAt: string;
}
const usersByEmail = new Map<string, StoredUser>();
const usersByPid = new Map<string, StoredUser>();
const sessions = new Map<string, Session>();
const codes = new Map<string, PendingCode>();
const clansByTag = new Map<string, StoredClan>();
let friendships: StoredFriendship[] = [];
let friendRequests: StoredFriendRequest[] = [];
let conversations: StoredConversation[] = [];
let playerGames: StoredPlayerGame[] = [];
// Parsed once at startup. Purchases validate item names/prices against this.
const cosmetics = CosmeticsSchema.parse(cosmeticsJson);
const databaseUrl = process.env.DATABASE_URL;
requireDurableAuthStorage(ServerEnv.env(), databaseUrl);
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
  friendships = raw.friendships ?? [];
  friendRequests = raw.friendRequests ?? [];
  conversations = raw.conversations ?? [];
  playerGames = raw.playerGames ?? [];
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
      await database.query(`
        CREATE TABLE IF NOT EXISTS openback_games (
          game_id TEXT PRIMARY KEY,
          record JSONB NOT NULL,
          started_at BIGINT NOT NULL
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
let persistenceQueue: Promise<void> = Promise.resolve();
function persistenceSnapshot(): PersistShape {
  return {
    users: [...usersByPid.values()],
    sessions: Object.fromEntries(sessions),
    clans: [...clansByTag.values()],
    friendships,
    friendRequests,
    conversations,
    playerGames,
  };
}

async function writePersisted(data: PersistShape): Promise<void> {
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
}

function queuePersistedSnapshot(): Promise<void> {
  const data = persistenceSnapshot();
  const queued = persistenceQueue.then(() => writePersisted(data));
  persistenceQueue = queued.catch(() => undefined);
  return queued;
}

function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void queuePersistedSnapshot().catch((error) =>
      console.error("[auth] failed to save persistent state", error),
    );
  }, 500);
}

async function persistImmediately(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  await queuePersistedSnapshot();
}
const persistenceReady = loadPersisted();

// ---- Origin & Google config -----------------------------------------------
export function authOrigin(): string {
  return ServerEnv.authOrigin();
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
      selectedFlag: user.selectedFlag,
      selectedCosmetic: user.selectedCosmetic,
    },
    player: {
      publicId: user.publicId,
      adfree: false,
      flares: user.flares ?? [],
      achievements: { singleplayerMap: [] },
      leaderboard:
        user.elo !== undefined ? { oneVone: { elo: user.elo } } : undefined,
      currency: {
        soft: user.currencySoft ?? 0,
        hard: user.currencyHard ?? 0,
      },
      clans,
      clanRequests,
      friends: friendships
        .filter(
          (friendship) =>
            friendship.a === user.publicId || friendship.b === user.publicId,
        )
        .map((friendship) =>
          friendship.a === user.publicId ? friendship.b : friendship.a,
        ),
      subscription: null,
    },
  });
}

function userByPublicId(publicId: string): StoredUser | null {
  for (const user of usersByPid.values()) {
    if (user.publicId === publicId) return user;
  }
  return null;
}

function usernameFor(user: StoredUser): string {
  return user.displayName ?? user.publicId;
}

function clanTagFor(user: StoredUser): string | null {
  for (const clan of clansByTag.values()) {
    if (clan.members.some((m) => m.publicId === user.publicId)) {
      return clan.tag;
    }
  }
  return null;
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

function createEmailUser(email: string): StoredUser {
  const normalized = email.toLowerCase();
  if (usersByEmail.has(normalized)) {
    throw new Error("account_exists");
  }
  return findOrCreateUser({ email: normalized });
}

function deleteUser(user: StoredUser): void {
  usersByPid.delete(user.persistentId);
  if (user.email) usersByEmail.delete(user.email.toLowerCase());
  else usersByEmail.delete(user.persistentId);

  for (const [sessionId, session] of sessions) {
    if (session.persistentId === user.persistentId) sessions.delete(sessionId);
  }

  for (const [tag, clan] of clansByTag) {
    clan.chatMessages = clan.chatMessages?.filter(
      (message) => message.sender !== user.publicId,
    );
    clan.requests = clan.requests.filter(
      (request) => request.publicId !== user.publicId,
    );
    clan.bans = clan.bans.filter((ban) => ban.publicId !== user.publicId);
    const member = clan.members.find(
      (candidate) => candidate.publicId === user.publicId,
    );
    if (!member) continue;
    clan.members = clan.members.filter(
      (candidate) => candidate.publicId !== user.publicId,
    );
    if (clan.members.length === 0) {
      clansByTag.delete(tag);
    } else if (member.role === "leader") {
      clan.members[0].role = "leader";
    }
  }
  friendships = friendships.filter(
    (friendship) =>
      friendship.a !== user.publicId && friendship.b !== user.publicId,
  );
  friendRequests = friendRequests.filter(
    (request) => request.from !== user.publicId && request.to !== user.publicId,
  );
  conversations = conversations
    .map((conversation) => ({
      ...conversation,
      members: conversation.members.filter(
        (publicId) => publicId !== user.publicId,
      ),
      messages: conversation.messages.filter(
        (message) => message.sender !== user.publicId,
      ),
    }))
    .filter((conversation) =>
      conversation.kind === "direct"
        ? conversation.members.length === 2
        : conversation.members.length > 0,
    );
  playerGames = playerGames.filter((game) => game.publicId !== user.publicId);
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

async function newSession(user: StoredUser): Promise<string> {
  const id = crypto.randomBytes(32).toString("base64url");
  sessions.set(id, { persistentId: user.persistentId, createdAt: Date.now() });
  await persistImmediately();
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

async function userFromToken(token: string): Promise<StoredUser | null> {
  await ensureKeys();
  try {
    const { payload } = await jwtVerify(token, getPublicJwk(), {
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

async function userFromBearer(
  req: express.Request,
): Promise<StoredUser | null> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return userFromToken(auth.slice(7));
}

// New ranked players begin at zero OB and build their rating through play.
export const DEFAULT_OB = 0;
const OB_PROGRESS_REWARD_STEP = 100;
const OB_PROGRESS_REWARD_CAPS = 100;
const OB_MILESTONE_REWARD_CAPS = 500;
export const OB_MILESTONES = [
  100, 200, 300, 500, 700, 1200, 1500, 2000, 2500, 3000, 4000, 5000, 6000, 7000,
  8000, 9000, 10_000,
] as const;

// Used by the matchmaking service (same master process) to resolve a queued
// player's identity and current rating from their play token.
export async function resolveRankedPlayer(token: string): Promise<{
  publicId: string;
  persistentId: string;
  displayName: string;
  elo: number;
} | null> {
  const user = await userFromToken(token);
  if (!user) return null;
  return {
    publicId: user.publicId,
    persistentId: user.persistentId,
    displayName: usernameFor(user),
    elo: user.elo ?? DEFAULT_OB,
  };
}

export function areFriends(a: string, b: string): boolean {
  return friendships.some(
    (friendship) =>
      (friendship.a === a && friendship.b === b) ||
      (friendship.a === b && friendship.b === a),
  );
}

// Ranked OB keeps the chess-style expected-score curve, caps gains at 500, and
// lets a heavily favored loser drop in proportion to the rating mismatch.
function awardObProgress(
  user: StoredUser,
  previousOb: number,
  nextOb: number,
): void {
  const gained = Math.max(0, nextOb - previousOb);
  const previousEarned = user.rankedObEarned ?? 0;
  const nextEarned = previousEarned + gained;
  const progressSteps =
    Math.floor(nextEarned / OB_PROGRESS_REWARD_STEP) -
    Math.floor(previousEarned / OB_PROGRESS_REWARD_STEP);

  const claimedMilestones = new Set(user.obMilestones ?? []);
  let newMilestones = 0;
  for (const milestone of OB_MILESTONES) {
    if (
      previousOb < milestone &&
      nextOb >= milestone &&
      !claimedMilestones.has(milestone)
    ) {
      claimedMilestones.add(milestone);
      newMilestones++;
    }
  }

  const caps =
    progressSteps * OB_PROGRESS_REWARD_CAPS +
    newMilestones * OB_MILESTONE_REWARD_CAPS;
  if (caps > 0) user.currencySoft = (user.currencySoft ?? 0) + caps;
  user.rankedObEarned = nextEarned;
  user.obMilestones = [...claimedMilestones].sort((a, b) => a - b);
}

function expectedObScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function calculateObGain(
  winnerRating: number,
  loserRating: number,
): number {
  const upsetStrength = 1 - expectedObScore(winnerRating, loserRating);
  const opponentQuality = Math.min(1, Math.max(0.2, loserRating / 1000));
  return Math.max(
    10,
    Math.min(500, Math.round(500 * upsetStrength * opponentQuality)),
  );
}

export function calculateObLoss(
  loserRating: number,
  winnerRating: number,
): number {
  const expectedToWin = expectedObScore(loserRating, winnerRating);
  const favoriteGap = Math.max(0, loserRating - winnerRating);
  const ratingAtRisk = 10 + favoriteGap / 10;
  return Math.max(1, Math.round(ratingAtRisk * expectedToWin));
}

export function recordRankedResult(
  winnerPersistentId: string,
  loserPersistentId: string,
): boolean {
  const winner = usersByPid.get(winnerPersistentId);
  const loser = usersByPid.get(loserPersistentId);
  if (!winner || !loser) return false;
  const rw = winner.elo ?? DEFAULT_OB;
  const rl = loser.elo ?? DEFAULT_OB;
  const gain = calculateObGain(rw, rl);
  const drop = calculateObLoss(rl, rw);
  winner.elo = rw + gain;
  loser.elo = Math.max(0, rl - drop);
  awardObProgress(winner, rw, winner.elo);
  winner.peakElo = Math.max(winner.peakElo ?? winner.elo, winner.elo);
  loser.peakElo = Math.max(loser.peakElo ?? loser.elo, loser.elo);
  winner.rankedWins = (winner.rankedWins ?? 0) + 1;
  loser.rankedLosses = (loser.rankedLosses ?? 0) + 1;
  persist();
  return true;
}

// Team ranked compares each participant with the opposing team's average OB.
export function recordRankedTeamResult(
  winnerPersistentIds: string[],
  loserPersistentIds: string[],
): boolean {
  const winners = winnerPersistentIds.map((id) => usersByPid.get(id));
  const losers = loserPersistentIds.map((id) => usersByPid.get(id));
  if (
    winners.some((user) => user === undefined) ||
    losers.some((user) => user === undefined)
  ) {
    return false;
  }
  const winnerUsers = winners as StoredUser[];
  const loserUsers = losers as StoredUser[];
  const winnerAverage =
    winnerUsers.reduce((sum, user) => sum + (user.elo ?? DEFAULT_OB), 0) /
    winnerUsers.length;
  const loserAverage =
    loserUsers.reduce((sum, user) => sum + (user.elo ?? DEFAULT_OB), 0) /
    loserUsers.length;
  for (const winner of winnerUsers) {
    const rating = winner.elo ?? DEFAULT_OB;
    winner.elo = rating + calculateObGain(rating, loserAverage);
    awardObProgress(winner, rating, winner.elo);
    winner.peakElo = Math.max(winner.peakElo ?? winner.elo, winner.elo);
    winner.rankedWins = (winner.rankedWins ?? 0) + 1;
  }
  for (const loser of loserUsers) {
    const rating = loser.elo ?? DEFAULT_OB;
    loser.elo = Math.max(0, rating - calculateObLoss(rating, winnerAverage));
    loser.peakElo = Math.max(loser.peakElo ?? loser.elo, loser.elo);
    loser.rankedLosses = (loser.rankedLosses ?? 0) + 1;
  }
  persist();
  return true;
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

// Attach the account's display name to a clan entry (member/request/ban) so the
// UI can show a friendly name. The publicId stays on the object for friending.
function withDisplayName<T extends { publicId: string }>(
  entry: T,
): T & { displayName?: string } {
  return {
    ...entry,
    displayName: usersByPid.get(entry.publicId)?.displayName,
  };
}

function canManageClan(clan: StoredClan, user: StoredUser): boolean {
  const member = memberFor(clan, user);
  return member?.role === "leader" || member?.role === "officer";
}

// ---- Email ----------------------------------------------------------------
const RequestCodeSchema = z.object({
  email: z.string().email(),
  mode: z.enum(["signup", "login"]),
});
const VerifyCodeSchema = RequestCodeSchema.extend({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
});

export async function sendCodeEmail(
  email: string,
  code: string,
  mode: EmailAuthMode = "login",
): Promise<string | null> {
  const action = mode === "signup" ? "sign-up" : "login";
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
        subject: `Your OpenBack ${action} code`,
        textContent: `Your OpenBack ${action} code is: ${code}\n\nIt expires in 10 minutes.`,
        htmlContent:
          `<p>Your OpenBack ${action} code is:</p>` +
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
      subject: `Your OpenBack ${action} code`,
      text: `Your OpenBack ${action} code is: ${code}\n\nIt expires in 10 minutes.`,
    });
    return null;
  } catch (e) {
    console.error("[auth] failed to send email", e);
    if (ServerEnv.env() === GameEnv.Dev) return code;
    throw e;
  }
}

function gameResultFor(
  record: GameRecord,
  clientID: string,
): "victory" | "defeat" | "incomplete" {
  const winner = record.info.winner;
  if (!winner) return "incomplete";
  if (winner[0] === "nation") return "defeat";
  const winnerIDs = new Set(winner.slice(winner[0] === "team" ? 2 : 1));
  return winnerIDs.has(clientID) ? "victory" : "defeat";
}

function summariesForGame(record: GameRecord): StoredPlayerGame[] {
  const config = record.info.config;
  return record.info.players.flatMap((player) => {
    const account =
      usersByPid.get(player.persistentID ?? "") ??
      (player.publicId ? userByPublicId(player.publicId) : null);
    if (!account) return [];
    return [
      {
        publicId: account.publicId,
        gameId: record.info.gameID,
        start: new Date(record.info.start).toISOString(),
        durationSeconds: record.info.duration,
        map: config.gameMap,
        mode: config.gameMode,
        type: config.gameType,
        playerTeams:
          config.playerTeams === undefined ? null : String(config.playerTeams),
        rankedType: config.rankedType ?? "unranked",
        result: gameResultFor(record, player.clientID),
        totalPlayers: record.info.players.length,
        username: player.username,
        clanTag: player.clanTag ?? null,
      },
    ];
  });
}

async function awardMatchCurrency(
  record: GameRecord,
  summaries: StoredPlayerGame[],
): Promise<void> {
  const config = record.info.config;
  const fullMapNationCount = await getMapNationCount(config.gameMap);
  const suggestedNationCount =
    config.gameMapSize === GameMapSize.Compact
      ? Math.max(1, Math.floor(fullMapNationCount * 0.25))
      : fullMapNationCount;
  const configuredNationCount =
    typeof config.nations === "number"
      ? config.nations
      : config.nations === "disabled"
        ? 0
        : config.gameMode === GameMode.Team &&
            config.playerTeams === HumansVsNations
          ? record.info.players.length
          : config.gameMapSize === GameMapSize.Compact
            ? suggestedNationCount
            : fullMapNationCount;
  const minimumNationCount = Math.ceil(suggestedNationCount / 2);
  if (configuredNationCount < minimumNationCount) return;

  const rewardedPlayers = new Set<string>();
  for (const summary of summaries) {
    if (
      summary.result === "incomplete" ||
      rewardedPlayers.has(summary.publicId)
    ) {
      continue;
    }
    const account = userByPublicId(summary.publicId);
    if (!account) continue;
    const reward =
      MATCH_COMPLETION_REWARD +
      (summary.result === "victory" ? MATCH_VICTORY_BONUS : 0);
    account.currencySoft = (account.currencySoft ?? 0) + reward;
    rewardedPlayers.add(summary.publicId);
  }
}

async function storeFullGameRecord(record: GameRecord): Promise<void> {
  const serialized = JSON.stringify(record, replacer);
  if (database) {
    await database.query(
      `INSERT INTO openback_games (game_id, record, started_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (game_id) DO UPDATE
       SET record = EXCLUDED.record, started_at = EXCLUDED.started_at`,
      [record.info.gameID, serialized, record.info.start],
    );
    return;
  }
  fs.mkdirSync(GAME_RECORD_DIR, { recursive: true });
  fs.writeFileSync(`${GAME_RECORD_DIR}/${record.info.gameID}.json`, serialized);
}

async function loadFullGameRecord(gameId: string): Promise<unknown | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(gameId)) return null;
  if (database) {
    const result = await database.query<{ record: unknown }>(
      "SELECT record FROM openback_games WHERE game_id = $1",
      [gameId],
    );
    return result.rows[0]?.record ?? null;
  }
  const path = `${GAME_RECORD_DIR}/${gameId}.json`;
  if (!fs.existsSync(path)) return null;
  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

function matchesGameMode(
  game: StoredPlayerGame,
  filter: PlayerGameModeFilter | undefined,
): boolean {
  if (!filter) return true;
  if (filter === "ranked") return game.rankedType !== "unranked";
  if (filter === "hvn") return game.playerTeams === HumansVsNations;
  if (filter === "team") {
    return game.mode === GameMode.Team && game.playerTeams !== HumansVsNations;
  }
  return game.mode === GameMode.FFA && game.rankedType === "unranked";
}

function historyCursor(game: StoredPlayerGame): string {
  return Buffer.from(JSON.stringify([game.start, game.gameId])).toString(
    "base64url",
  );
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

  router.post("/game/:id", async (req, res) => {
    if (req.header("x-api-key") !== ServerEnv.apiKey()) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = GameRecordSchema.safeParse(req.body);
    if (!parsed.success || parsed.data.info.gameID !== req.params.id) {
      res.status(400).json({ error: "invalid_game_record" });
      return;
    }
    try {
      const alreadyArchived =
        (await loadFullGameRecord(parsed.data.info.gameID)) !== null;
      const summaries = summariesForGame(parsed.data);
      await storeFullGameRecord(parsed.data);
      playerGames = playerGames.filter(
        (game) => game.gameId !== parsed.data.info.gameID,
      );
      playerGames.push(...summaries);
      if (!alreadyArchived) await awardMatchCurrency(parsed.data, summaries);
      await persistImmediately();
      res.json({ ok: true });
    } catch (error) {
      console.error("[auth] failed to archive game", error);
      res.status(503).json({ error: "archive_unavailable" });
    }
  });

  router.get("/game/:id", async (req, res) => {
    const record = await loadFullGameRecord(req.params.id);
    if (!record) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.type("application/json").send(JSON.stringify(record, replacer));
  });

  router.get("/public/player/:publicId/games", (req, res) => {
    const mode = req.query.filter as PlayerGameModeFilter | undefined;
    const type = req.query.type as PlayerGameTypeFilter | undefined;
    if (mode && !["ffa", "team", "hvn", "ranked"].includes(mode)) {
      res.status(400).json({ error: "invalid_filter" });
      return;
    }
    if (type && !["public", "private", "singleplayer"].includes(type)) {
      res.status(400).json({ error: "invalid_type" });
      return;
    }
    const ordered = playerGames
      .filter(
        (game) =>
          game.publicId === req.params.publicId &&
          matchesGameMode(game, mode) &&
          (!type || game.type.toLowerCase() === type),
      )
      .sort(
        (a, b) =>
          b.start.localeCompare(a.start) || b.gameId.localeCompare(a.gameId),
      );
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";
    const cursorIndex = cursor
      ? ordered.findIndex((game) => historyCursor(game) === cursor)
      : -1;
    const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const page = ordered.slice(startIndex, startIndex + 25);
    const hasMore = startIndex + page.length < ordered.length;
    res.json({
      results: page.map(({ publicId: _publicId, ...game }) => game),
      nextCursor:
        hasMore && page.length ? historyCursor(page[page.length - 1]) : null,
    });
  });

  router.post("/auth/request-code", async (req, res) => {
    const parsed = RequestCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_email" });
      return;
    }
    const email = parsed.data.email.toLowerCase();
    const accountExists = usersByEmail.has(email);
    const sessionUser = userFromSession(req);
    const canClaimAnonymousAccount = Boolean(sessionUser && !sessionUser.email);
    if (parsed.data.mode === "signup" && accountExists) {
      res.json({
        ok: false,
        error: "account_exists",
        nextAction: "login",
      });
      return;
    }
    if (
      parsed.data.mode === "login" &&
      !accountExists &&
      !canClaimAnonymousAccount
    ) {
      res.json({
        ok: false,
        error: "not_registered",
        nextAction: "signup",
      });
      return;
    }
    const code = String(crypto.randomInt(100000, 1000000));
    codes.set(email, {
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
      mode: parsed.data.mode,
    });
    try {
      const devCode = await sendCodeEmail(email, code, parsed.data.mode);
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
    const parsed = VerifyCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_fields" });
      return;
    }
    const { code, mode } = parsed.data;
    const email = parsed.data.email.toLowerCase();
    const pending = codes.get(email);
    if (!pending || pending.expiresAt < Date.now()) {
      codes.delete(email);
      res.status(400).json({ error: "code_expired" });
      return;
    }
    if (pending.mode !== mode) {
      res.status(400).json({ error: "wrong_auth_flow" });
      return;
    }
    if (pending.attempts >= 5) {
      codes.delete(email);
      res.status(429).json({ error: "too_many_attempts" });
      return;
    }
    if (pending.code !== String(code).trim()) {
      pending.attempts++;
      res.status(401).json({ error: "invalid_code" });
      return;
    }
    const existing = usersByEmail.get(email);
    const sessionUser = userFromSession(req);
    if (mode === "signup" && existing) {
      codes.delete(email);
      res.status(409).json({
        error: "account_exists",
        nextAction: "login",
      });
      return;
    }
    if (mode === "login" && !existing && !(sessionUser && !sessionUser.email)) {
      codes.delete(email);
      res.status(404).json({
        error: "not_registered",
        nextAction: "signup",
      });
      return;
    }
    codes.delete(email);
    const oldSession = getCookie(req, SESSION_COOKIE);
    let user: StoredUser;
    if (existing) {
      user = existing;
      if (sessionUser && !sessionUser.email && sessionUser !== existing) {
        deleteUser(sessionUser);
      }
    } else if (sessionUser && !sessionUser.email) {
      usersByEmail.delete(sessionUser.persistentId);
      sessionUser.email = email;
      usersByEmail.set(email, sessionUser);
      user = sessionUser;
      persist();
    } else {
      user = createEmailUser(email);
    }
    if (oldSession) sessions.delete(oldSession);
    const sessionId = await newSession(user);
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
      const sessionId = await newSession(user);
      setSessionCookie(res, sessionId);
    } else {
      const sessionId = getCookie(req, SESSION_COOKIE);
      if (sessionId) setSessionCookie(res, sessionId);
    }
    const { jwt, expiresIn } = await signToken(user);
    res.json({ jwt, expiresIn });
  });

  router.post("/auth/logout", (req, res) => {
    const cookie = getCookie(req, SESSION_COOKIE);
    if (cookie) {
      sessions.delete(cookie);
      persist();
    }
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  router.post("/auth/revoke", (req, res) => {
    const cookie = getCookie(req, SESSION_COOKIE);
    const current = cookie ? sessions.get(cookie) : undefined;
    if (current) {
      for (const [sessionId, session] of sessions) {
        if (session.persistentId === current.persistentId) {
          sessions.delete(sessionId);
        }
      }
      persist();
    }
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    res.json({ ok: true });
  });

  router.delete("/auth/account", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user || !user.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (req.body?.confirmation !== "DELETE") {
      res.status(400).json({ error: "confirmation_required" });
      return;
    }
    const rollback = structuredClone(persistenceSnapshot());
    deleteUser(user);
    try {
      await persistImmediately();
    } catch (error) {
      hydrate(rollback);
      console.error("[auth] account deletion could not be persisted", error);
      res.status(503).json({ error: "persistent_storage_unavailable" });
      return;
    }
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
        selectedFlag: z.string().trim().max(80).nullable().optional(),
        selectedCosmetic: z.string().trim().max(160).nullable().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_profile" });
      return;
    }
    const { selectedFlag, selectedCosmetic, ...profile } = parsed.data;
    Object.assign(user, profile);
    if (selectedFlag !== undefined) {
      user.selectedFlag = selectedFlag ?? undefined;
    }
    if (selectedCosmetic !== undefined) {
      user.selectedCosmetic = selectedCosmetic ?? undefined;
    }
    persist();
    res.json(userMeFor(user));
  });

  const friendEntry = (publicId: string, createdAt: string) => ({
    publicId,
    displayName: userByPublicId(publicId)?.displayName,
    createdAt,
  });

  router.get("/friends", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? 1), 10));
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit ?? 20), 10)),
    );
    const all = friendships
      .filter(
        (friendship) =>
          friendship.a === user.publicId || friendship.b === user.publicId,
      )
      .map((friendship) =>
        friendEntry(
          friendship.a === user.publicId ? friendship.b : friendship.a,
          friendship.createdAt,
        ),
      )
      .sort((a, b) => a.publicId.localeCompare(b.publicId));
    const start = (page - 1) * limit;
    res.json({
      results: all.slice(start, start + limit),
      total: all.length,
      page,
      limit,
    });
  });

  router.get("/friends/requests", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({
      incoming: friendRequests
        .filter((request) => request.to === user.publicId)
        .map((request) => friendEntry(request.from, request.createdAt)),
      outgoing: friendRequests
        .filter((request) => request.from === user.publicId)
        .map((request) => friendEntry(request.to, request.createdAt)),
    });
  });

  router.post("/friends/requests/:id", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const targetId = String(req.params.id);
    if (targetId === user.publicId) {
      res.status(400).json({ error: "cannot_friend_self" });
      return;
    }
    const target = userByPublicId(targetId);
    if (!target?.email) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (areFriends(user.publicId, targetId)) {
      res.status(409).json({ error: "already_friends" });
      return;
    }
    const reverseIndex = friendRequests.findIndex(
      (request) => request.from === targetId && request.to === user.publicId,
    );
    if (reverseIndex !== -1) {
      const reverse = friendRequests[reverseIndex];
      friendRequests.splice(reverseIndex, 1);
      friendships.push({
        a: user.publicId,
        b: targetId,
        createdAt: new Date().toISOString(),
      });
      persist();
      res.json({ status: "accepted", requestedAt: reverse.createdAt });
      return;
    }
    if (
      friendRequests.some(
        (request) => request.from === user.publicId && request.to === targetId,
      )
    ) {
      res.status(409).json({ error: "request_exists" });
      return;
    }
    friendRequests.push({
      from: user.publicId,
      to: targetId,
      createdAt: new Date().toISOString(),
    });
    persist();
    res.json({ status: "requested" });
  });

  router.post("/friends/requests/:id/accept", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const requesterId = String(req.params.id);
    const index = friendRequests.findIndex(
      (request) => request.from === requesterId && request.to === user.publicId,
    );
    if (index === -1) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    friendRequests.splice(index, 1);
    if (!areFriends(user.publicId, requesterId)) {
      friendships.push({
        a: user.publicId,
        b: requesterId,
        createdAt: new Date().toISOString(),
      });
    }
    persist();
    res.json({ ok: true });
  });

  router.delete("/friends/requests/:id", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const otherId = String(req.params.id);
    const before = friendRequests.length;
    friendRequests = friendRequests.filter(
      (request) =>
        !(
          (request.from === user.publicId && request.to === otherId) ||
          (request.from === otherId && request.to === user.publicId)
        ),
    );
    if (friendRequests.length === before) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    persist();
    res.json({ ok: true });
  });

  router.delete("/friends/:id", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const otherId = String(req.params.id);
    const before = friendships.length;
    friendships = friendships.filter(
      (friendship) =>
        !(
          (friendship.a === user.publicId && friendship.b === otherId) ||
          (friendship.a === otherId && friendship.b === user.publicId)
        ),
    );
    if (friendships.length === before) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    persist();
    res.json({ ok: true });
  });

  const chatMessageFor = (message: StoredChatMessage) => ({
    ...message,
    senderName: userByPublicId(message.sender)?.displayName,
  });
  const conversationMembers = (conversation: StoredConversation) =>
    conversation.members.map((publicId) =>
      friendEntry(publicId, conversation.createdAt),
    );
  const conversationName = (
    conversation: StoredConversation,
    viewerId: string,
  ) => {
    if (conversation.kind === "group") return conversation.name ?? "Group";
    const otherId = conversation.members.find((id) => id !== viewerId);
    return otherId
      ? (userByPublicId(otherId)?.displayName ?? otherId)
      : "Direct chat";
  };
  const conversationFor = (
    conversation: StoredConversation,
    viewerId: string,
  ) => ({
    id: conversation.id,
    kind: conversation.kind,
    name: conversationName(conversation, viewerId),
    members: conversationMembers(conversation),
    lastMessage: conversation.messages[conversation.messages.length - 1]
      ? chatMessageFor(conversation.messages[conversation.messages.length - 1])
      : undefined,
  });

  router.get("/social/conversations", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const results = conversations
      .filter((conversation) => conversation.members.includes(user.publicId))
      .map((conversation) => conversationFor(conversation, user.publicId))
      .sort((a, b) =>
        (b.lastMessage?.createdAt ?? "").localeCompare(
          a.lastMessage?.createdAt ?? "",
        ),
      );
    res.json({ results });
  });

  router.post("/social/conversations/direct/:id", async (req, res) => {
    const user = await userFromBearer(req);
    const targetId = String(req.params.id);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!areFriends(user.publicId, targetId)) {
      res.status(403).json({ error: "friends_only" });
      return;
    }
    let conversation = conversations.find(
      (candidate) =>
        candidate.kind === "direct" &&
        candidate.members.includes(user.publicId) &&
        candidate.members.includes(targetId),
    );
    if (!conversation) {
      conversation = {
        id: generateID(),
        kind: "direct",
        createdBy: user.publicId,
        members: [user.publicId, targetId],
        createdAt: new Date().toISOString(),
        messages: [],
      };
      conversations.push(conversation);
      persist();
    }
    res.json(conversationFor(conversation, user.publicId));
  });

  router.post("/social/groups", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user?.email) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = z
      .object({
        name: z.string().trim().min(1).max(40),
        members: z.array(z.string()).min(1).max(19),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const memberIds = [
      user.publicId,
      ...new Set(parsed.data.members.filter((id) => id !== user.publicId)),
    ];
    if (
      memberIds.length < 2 ||
      memberIds.slice(1).some((id) => !areFriends(user.publicId, id))
    ) {
      res.status(403).json({ error: "friends_only" });
      return;
    }
    const conversation: StoredConversation = {
      id: generateID(),
      kind: "group",
      name: parsed.data.name,
      createdBy: user.publicId,
      members: memberIds,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    conversations.push(conversation);
    persist();
    res.status(201).json(conversationFor(conversation, user.publicId));
  });

  router.get("/social/conversations/:id/messages", async (req, res) => {
    const user = await userFromBearer(req);
    const conversation = conversations.find(
      (candidate) => candidate.id === String(req.params.id),
    );
    if (!user?.email || !conversation?.members.includes(user.publicId)) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      results: conversation.messages.slice(-500).map(chatMessageFor),
    });
  });

  router.post("/social/conversations/:id/messages", async (req, res) => {
    const user = await userFromBearer(req);
    const conversation = conversations.find(
      (candidate) => candidate.id === String(req.params.id),
    );
    if (!user?.email || !conversation?.members.includes(user.publicId)) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (
      conversation.kind === "direct" &&
      !conversation.members
        .filter((id) => id !== user.publicId)
        .every((id) => areFriends(user.publicId, id))
    ) {
      res.status(403).json({ error: "friends_only" });
      return;
    }
    const parsed = z
      .object({ text: z.string().trim().min(1).max(500) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const message: StoredChatMessage = {
      id: crypto.randomUUID(),
      sender: user.publicId,
      text: parsed.data.text,
      createdAt: new Date().toISOString(),
    };
    conversation.messages.push(message);
    await persistImmediately();
    res.status(201).json(chatMessageFor(message));
  });

  router.get("/clans/:tag/chat", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clansByTag.get(String(req.params.tag).toUpperCase());
    if (!user?.email || !clan || !memberFor(clan, user)) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({
      results: (clan.chatMessages ?? []).slice(-500).map(chatMessageFor),
    });
  });

  router.post("/clans/:tag/chat", async (req, res) => {
    const user = await userFromBearer(req);
    const clan = clansByTag.get(String(req.params.tag).toUpperCase());
    if (!user?.email || !clan || !memberFor(clan, user)) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const parsed = z
      .object({ text: z.string().trim().min(1).max(500) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const message: StoredChatMessage = {
      id: crypto.randomUUID(),
      sender: user.publicId,
      text: parsed.data.text,
      createdAt: new Date().toISOString(),
    };
    (clan.chatMessages ??= []).push(message);
    await persistImmediately();
    res.status(201).json(chatMessageFor(message));
  });

  // Public player profile by publicId. It intentionally contains only the
  // identity fields players chose to show; private email/session data never
  // leaves the account endpoint.
  router.get("/player/:id", async (req, res) => {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const target = userByPublicId(id);
    if (!target) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(
      PlayerProfileSchema.parse({
        createdAt: new Date(target.createdAt).toISOString(),
        publicId: target.publicId,
        displayName: usernameFor(target),
        bio: target.bio,
        bannerColor: target.bannerColor,
        selectedFlag: target.selectedFlag,
        selectedCosmetic: target.selectedCosmetic,
        elo: target.elo,
        clanTag: clanTagFor(target) ?? undefined,
        stats: {},
      }),
    );
  });

  // Ranked 1v1 leaderboard, sorted by OB descending, paginated.
  const LEADERBOARD_PAGE_SIZE = 50;
  router.get("/leaderboard/ranked", (req, res) => {
    const page = Math.floor(Number(req.query.page ?? 1));
    if (!Number.isFinite(page) || page < 1) {
      res.status(200).json({ message: "Page must be between 1 and 1" });
      return;
    }
    const ranked = [...usersByPid.values()]
      .filter((u) => u.elo !== undefined)
      .sort((a, b) => (b.elo ?? 0) - (a.elo ?? 0));
    const maxPage = Math.max(
      1,
      Math.ceil(ranked.length / LEADERBOARD_PAGE_SIZE),
    );
    if (page > maxPage) {
      res
        .status(200)
        .json({ message: `Page must be between 1 and ${maxPage}` });
      return;
    }
    const start = (page - 1) * LEADERBOARD_PAGE_SIZE;
    const entries = ranked
      .slice(start, start + LEADERBOARD_PAGE_SIZE)
      .map((u, i) => {
        const wins = u.rankedWins ?? 0;
        const losses = u.rankedLosses ?? 0;
        const total = wins + losses;
        return {
          rank: start + i + 1,
          elo: u.elo ?? 0,
          peakElo: u.peakElo ?? null,
          wins,
          losses,
          total,
          public_id: u.publicId,
          username: usernameFor(u),
          clanTag: clanTagFor(u),
        };
      });
    res.json(
      RankedLeaderboardResponseSchema.parse({ [RankedType.OneVOne]: entries }),
    );
  });

  // Currency purchase of a cosmetic. Grants the matching ownership flare.
  router.post("/shop/purchase", async (req, res) => {
    const user = await userFromBearer(req);
    if (!user) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = z
      .object({
        cosmeticType: z.enum(["pattern", "skin", "flag"]),
        cosmeticName: z.string(),
        currencyType: z.enum(["hard", "soft"]),
        colorPaletteName: z.string().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const { cosmeticType, cosmeticName, currencyType, colorPaletteName } =
      parsed.data;

    const collection =
      cosmeticType === "pattern"
        ? cosmetics.patterns
        : cosmeticType === "flag"
          ? cosmetics.flags
          : cosmetics.skins;
    const item = collection?.[cosmeticName];
    if (!item) {
      res.status(404).json({ error: "unknown_cosmetic" });
      return;
    }

    const price = currencyType === "hard" ? item.priceHard : item.priceSoft;
    if (price === undefined) {
      res.status(400).json({ error: "not_purchasable_with_currency" });
      return;
    }

    const balanceKey =
      currencyType === "hard" ? "currencyHard" : "currencySoft";
    const balance = user[balanceKey] ?? 0;
    if (balance < price) {
      res.status(402).json({ error: "insufficient_funds" });
      return;
    }

    const flare =
      cosmeticType === "pattern" && colorPaletteName
        ? `pattern:${cosmeticName}:${colorPaletteName}`
        : `${cosmeticType}:${cosmeticName}`;

    user[balanceKey] = balance - price;
    user.flares = user.flares ?? [];
    if (!user.flares.includes(flare)) {
      user.flares.push(flare);
    }
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
      res.json({ exists: false });
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
      results: clan.members.slice(start, start + limit).map(withDisplayName),
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
      results: clan.requests.slice(start, start + limit).map(withDisplayName),
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
      results: clan.bans.map(withDisplayName),
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
      const sessionId = await newSession(user);
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
