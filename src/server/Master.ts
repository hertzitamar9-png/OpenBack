import cluster from "cluster";
import crypto from "crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { GameEnv } from "../core/configuration/Config";
import { logger } from "./Logger";
import { MapPlaylist } from "./MapPlaylist";
import { MasterLobbyService } from "./MasterLobbyService";
import { MatchmakingService } from "./MatchmakingService";
import { setNoStoreHeaders } from "./NoStoreHeaders";
import {
  handleOpenBackContent,
  handleOpenBackContentApi,
  OPENBACK_CONTENT_PATHS,
} from "./OpenBackContent";
import { renderAppShell } from "./RenderHtml";
import { ServerEnv } from "./ServerEnv";
import { applyStaticAssetCacheControl } from "./StaticAssetCache";
import { authRouter } from "./auth/AuthServer";

const playlist = new MapPlaylist();
let lobbyService: MasterLobbyService;

const app = express();
const server = http.createServer(app);

const log = logger.child({ comp: "m" });

// Ranked matchmaking lives in the master so it shares the auth user store
// (and thus Elo) directly.
// Generate ranked rules in the single master process. With multiple game
// workers this keeps the no-repeat map history global instead of giving each
// worker an independent random sequence.
const matchmaking = new MatchmakingService(log, () => playlist.get1v1Config());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

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
        `    <priority>${index === 0 ? "1.0" : contentPath === "/guides" || contentPath === "/blog" ? "0.9" : "0.8"}</priority>\n` +
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

// Server-rendered learning content gives players useful documentation and
// gives search engines normal, linked HTML pages instead of an app-only shell.
app.get(OPENBACK_CONTENT_PATHS, handleOpenBackContent);

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

app.get("/api/health", (_req, res) => {
  const ready = lobbyService?.isHealthy() ?? false;
  if (ready) {
    res.json({ status: "ok" });
  } else {
    res.status(503).json({ status: "unavailable" });
  }
});

// SPA fallback route
app.get("/{*splat}", async function (_req, res) {
  try {
    const htmlPath = path.join(__dirname, "../../static/index.html");
    await renderAppShell(res, htmlPath);
  } catch (error) {
    log.error("Error rendering SPA fallback:", error);
    res.status(500).send("Internal Server Error");
  }
});
