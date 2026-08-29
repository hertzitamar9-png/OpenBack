import express from "express";
import rateLimit from "express-rate-limit";
import cluster from "node:cluster";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GameEnv } from "../core/configuration/Config";
import { getDescriptor } from "./DesktopRelease";
import { logger } from "./Logger";
import { MapPlaylist } from "./MapPlaylist";
import { MasterLobbyService } from "./MasterLobbyService";
import { MatchmakingService } from "./MatchmakingService";
import { setNoStoreHeaders } from "./NoStoreHeaders";
import {
  getOpenBackContentSeo,
  handleLegacyOpenBackContent,
  handleOpenBackContentApi,
  LEGACY_GUIDE_PATHS,
  OPENBACK_CONTENT_PATHS,
} from "./OpenBackContent";
import { renderAppShell } from "./RenderHtml";
import { ServerEnv } from "./ServerEnv";
import { SocialService } from "./SocialService";
import { applyStaticAssetCacheControl } from "./StaticAssetCache";
import { authRouter, closeAuthPersistence } from "./auth/AuthServer";

// Game workers fetch purchased Tribe names from the authoritative registry in
// this master process. Keep isolated worker tests fail-open unless they opt in.
process.env.CUSTOM_TRIBES_URL ??= "http://127.0.0.1:3000";

const playlist = new MapPlaylist();
let lobbyService: MasterLobbyService;
let masterStopping = false;

const app = express();
const server = http.createServer(app);

const log = logger.child({ comp: "m" });

// Ranked matchmaking lives in the master so it shares the auth user store
// (and thus OB) directly.
// Generate ranked rules in the single master process. With multiple game
// workers this keeps the no-repeat map history global instead of giving each
// worker an independent random sequence.
const matchmaking = new MatchmakingService(
  log,
  (teamSize, teams, preferences, experienceMode) =>
    playlist.getRankedConfig(teamSize, teams, preferences, experienceMode),
);
const social = new SocialService(log);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "256kb" }));

// Local, self-contained auth (email code + optional Google). Served from the
// same origin as the SPA so the browser can call it without CORS.
app.use(authRouter());

// The home-screen Tutorials and Blog panels consume the same content as the
// indexable HTML pages, keeping the app UI and search pages in sync.
app.get("/api/openback/content", handleOpenBackContentApi);

// Search-engine discovery files must be real text/XML responses. Without
// these explicit routes, the SPA fallback returned index.html for sitemap.xml.
app.get("/robots.txt", (_req, res) => {
  const origin = ServerEnv.authOrigin().replace(/\/+$/, "");
  res
    .set("Cache-Control", "no-store, max-age=0")
    .set("X-Robots-Tag", "index, follow")
    .type("text/plain")
    .send(
      [`User-agent: *`, `Allow: /`, `Sitemap: ${origin}/sitemap.xml`, ``].join(
        "\n",
      ),
    );
});

app.get("/sitemap.xml", (_req, res) => {
  const origin = ServerEnv.authOrigin().replace(/\/+$/, "");
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = ["/", ...OPENBACK_CONTENT_PATHS]
    .map(
      (contentPath, index) =>
        `  <url>\n` +
        `    <loc>${origin}${contentPath}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${index === 0 ? "daily" : "weekly"}</changefreq>\n` +
        `    <priority>${index === 0 ? "1.0" : contentPath === "/tutorials" || contentPath === "/blog" ? "0.9" : "0.8"}</priority>\n` +
        `  </url>`,
    )
    .join("\n");
  res
    .type("application/xml")
    .send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `${urls}\n` +
        `</urlset>\n`,
    );
});

app.get(LEGACY_GUIDE_PATHS, handleLegacyOpenBackContent);

// The legal pages are served at /terms and /privacy, but their old names are
// what is linked from elsewhere and what search engines went looking for. The
// SPA fallback answered those with the home page, which reads to a crawler as
// the page simply not existing. Send them to the real address instead.
const RENAMED_LEGAL_PAGES: Record<string, string> = {
  "/terms-of-service": "/terms",
  "/privacy-policy": "/privacy",
  "/tos": "/terms",
};
app.get(Object.keys(RENAMED_LEGAL_PAGES), (req, res) => {
  const destination = RENAMED_LEGAL_PAGES[req.path];
  if (destination === undefined) {
    res.status(404).type("text/plain").send("Not Found");
    return;
  }
  res.redirect(301, destination);
});

// An article address that does not exist must say so. Anything under /blog or
// /tutorials that is not a real page fell through to the SPA handler, which
// answered 200 with the home page's title and a canonical pointing at "/" --
// so every mistyped or stale article URL became another page claiming to be a
// copy of the home page.
app.get(["/blog/{*rest}", "/tutorials/{*rest}"], (req, res, next) => {
  if (OPENBACK_CONTENT_PATHS.includes(req.path)) {
    next();
    return;
  }
  res.status(404).type("text/plain").send("Not Found");
});

// Tutorials and Blog use the same interactive shell as every other OpenBack
// page while retaining route-specific crawlable content and metadata.
app.get(OPENBACK_CONTENT_PATHS, async (req, res) => {
  try {
    const origin = ServerEnv.authOrigin().replace(/\/+$/, "");
    const seo = getOpenBackContentSeo(req.path, origin);
    if (!seo) {
      res.status(404).type("text").send("Page not found");
      return;
    }
    await renderAppShell(
      res,
      path.join(__dirname, "../../static/index.html"),
      seo,
    );
  } catch (error) {
    log.error("Error rendering OpenBack content route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Serve the shared app shell for the root document.
app.use(async (req, res, next) => {
  if (req.path === "/") {
    try {
      await renderAppShell(
        res,
        path.join(__dirname, "../../static/index.html"),
      );
    } catch (error) {
      log.error("Error rendering index.html:", error);
      res.status(500).send("Internal Server Error");
    }
  } else {
    next();
  }
});

// Desktop (Steam) shell release descriptor. See openfront-desktop's
// docs/superpowers/specs/2026-08-20-runtime-asset-updating-design.md.
//
// version.json is polled once a minute by every running desktop client, so it
// is deliberately tiny and separately cacheable; release.json is fetched only
// when that pointer changes. Both must be reachable without a bot challenge --
// see OPE-192.
const staticDir = path.join(__dirname, "../../static");
const descriptorOpts = () => ({
  clientVersion: ServerEnv.gitCommit(),
  cdnBase: ServerEnv.cdnBase(),
  // Production must have a CDN: without one this descriptor would point every
  // Steam client at this app server for ~570MB of assets. Dev and preprod have
  // no CDN, and same-origin is what the web client already does there.
  requireCdnBase: ServerEnv.env() === GameEnv.Prod,
});

app.get("/desktop/version.json", async (_req, res) => {
  try {
    const d = await getDescriptor(staticDir, descriptorOpts());
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    res.json({ clientVersion: d.clientVersion, coreVersion: d.coreVersion });
  } catch (error) {
    log.error("Error building desktop version pointer:", error);
    res.status(500).json({ error: "unavailable" });
  }
});

app.get("/desktop/release.json", async (_req, res) => {
  try {
    const d = await getDescriptor(staticDir, descriptorOpts());
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30");
    res.json(d);
  } catch (error) {
    log.error("Error building desktop release descriptor:", error);
    res.status(500).json({ error: "unavailable" });
  }
});

app.use(
  express.static(path.join(__dirname, "../../static"), {
    maxAge: "1y", // Set max-age to 1 year for all static assets
    setHeaders: (res) => {
      applyStaticAssetCacheControl(
        res.setHeader.bind(res),
        res.req.originalUrl,
      );
    },
  }),
);

app.set("trust proxy", 3);
app.use(
  rateLimit({
    windowMs: 1000, // 1 second
    max: 20, // 20 requests per IP per second
  }),
);

app.use("/api", (_req, res, next) => {
  setNoStoreHeaders(res);
  next();
});

// Ranked matchmaking coordination. Workers poll /checkin (offering a gameId)
// and report finished 1v1s to /matchmaking/result. The /matchmaking/join WS
// upgrade is handled directly on the HTTP server in startMaster().
app.post("/checkin", matchmaking.handleCheckin);
app.post("/matchmaking/result", matchmaking.handleResult);

// Start the master process
export async function startMaster() {
  if (!cluster.isPrimary) {
    throw new Error(
      "startMaster() should only be called in the primary process",
    );
  }

  log.info(`Primary ${process.pid} is running`);
  log.info(`Setting up ${ServerEnv.numWorkers()} workers...`);

  lobbyService = new MasterLobbyService(playlist, log);

  // Handle ranked matchmaking WebSocket upgrades on the master HTTP server.
  matchmaking.attach(server);
  social.attach(server);

  const INSTANCE_ID =
    ServerEnv.env() === GameEnv.Dev
      ? "DEV_ID"
      : crypto.randomBytes(4).toString("hex");
  process.env.INSTANCE_ID = INSTANCE_ID;

  log.info(`Instance ID: ${INSTANCE_ID}`);

  // Fork workers
  for (let i = 0; i < ServerEnv.numWorkers(); i++) {
    const worker = cluster.fork({
      WORKER_ID: i,
      INSTANCE_ID,
    });

    lobbyService.registerWorker(i, worker);
    log.info(`Started worker ${i} (PID: ${worker.process.pid})`);
  }

  // Handle worker crashes
  cluster.on("exit", (worker, code, signal) => {
    if (masterStopping) return;
    const workerId = (worker as any).process?.env?.WORKER_ID;
    if (workerId === undefined) {
      log.error(`worker crashed could not find id`);
      return;
    }

    const workerIdNum = parseInt(workerId);
    lobbyService.removeWorker(workerIdNum);

    log.warn(
      `Worker ${workerId} (PID: ${worker.process.pid}) died with code: ${code} and signal: ${signal}`,
    );
    log.info(`Restarting worker ${workerId}...`);

    // Restart the worker with the same ID
    const newWorker = cluster.fork({
      WORKER_ID: workerId,
      INSTANCE_ID,
    });

    lobbyService.registerWorker(workerIdNum, newWorker);
    log.info(
      `Restarted worker ${workerId} (New PID: ${newWorker.process.pid})`,
    );
  });

  const PORT = 3000;
  server.listen(PORT, () => {
    log.info(`Master HTTP server listening on port ${PORT}`);
  });
}

export async function stopMaster(): Promise<void> {
  if (masterStopping) return;
  masterStopping = true;
  server.close();
  for (const worker of Object.values(cluster.workers ?? {})) {
    worker?.kill("SIGTERM");
  }
  await closeAuthPersistence();
}

// Matches in progress right now. The deploy script polls this and waits for
// zero before restarting: game state lives in worker memory, so a restart ends
// every match that is running, however gracefully the client handles it.
app.get("/api/live-matches", (_req, res) => {
  res.json(lobbyService?.liveCounts() ?? { matches: 0, players: 0 });
});

app.get("/api/health", (_req, res) => {
  const ready = lobbyService?.isHealthy() ?? false;
  if (ready) {
    res.json({ status: "ok" });
  } else {
    res.status(503).json({ status: "unavailable" });
  }
});

/**
 * A request for a file that does not exist must not be answered with the app.
 *
 * express.static runs before this fallback, so anything arriving here that
 * names a file is a file we do not have. Answering those with 200 and the app
 * shell told the world that every such URL exists: a request for
 * /setup.exe, /openback.apk or /files/crack.zip came back 200 with a 208 KB
 * body. That is enough for a link posted anywhere to look like a real download
 * hosted on this domain, and Google Safe Browsing flagged the site for hosting
 * harmful downloads on exactly that basis. It also had Google indexing
 * made-up paths such as /_assets as if they were pages.
 *
 * Application routes never name a file -- "/", "/settings", "/blog/an-article",
 * "/clans/TAG/overview" -- so the test is whether the last path segment has an
 * extension. Only that segment is examined, which keeps a route like
 * /profile/some.id/stats working.
 */
const FILENAME_SEGMENT = /\.[A-Za-z0-9]{1,10}$/;

function looksLikeAMissingFile(pathname: string): boolean {
  const lastSegment = pathname.split("/").filter(Boolean).pop();
  return lastSegment !== undefined && FILENAME_SEGMENT.test(lastSegment);
}

// SPA fallback route
app.get("/{*splat}", async function (req, res) {
  if (looksLikeAMissingFile(req.path)) {
    res.status(404).type("text/plain").send("Not Found");
    return;
  }
  try {
    const htmlPath = path.join(__dirname, "../../static/index.html");
    await renderAppShell(res, htmlPath);
  } catch (error) {
    log.error("Error rendering SPA fallback:", error);
    res.status(500).send("Internal Server Error");
  }
});
