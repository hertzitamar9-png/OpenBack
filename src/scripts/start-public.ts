import { spawn, type ChildProcess } from "node:child_process";
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const toolsDir = path.join(root, ".openback-tools");
const isWindows = process.platform === "win32";
const cloudflaredPath = path.join(
  toolsDir,
  isWindows ? "cloudflared.exe" : "cloudflared",
);

function cloudflaredDownloadUrl(): string {
  if (process.arch !== "x64") {
    throw new Error("The automatic public-host setup currently requires x64.");
  }
  if (isWindows) {
    return "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe";
  }
  if (process.platform === "linux") {
    return "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";
  }
  throw new Error("Install cloudflared manually for this operating system.");
}

async function ensureCloudflared(): Promise<void> {
  try {
    const existing = await stat(cloudflaredPath);
    if (existing.size > 0) return;
  } catch {
    // Download below.
  }

  console.log("Preparing the secure public tunnel...");
  await mkdir(toolsDir, { recursive: true });
  const response = await fetch(cloudflaredDownloadUrl(), {
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Could not download cloudflared (${response.status}).`);
  }
  await writeFile(cloudflaredPath, Buffer.from(await response.arrayBuffer()));
  if (!isWindows) await chmod(cloudflaredPath, 0o755);
}

function concurrentlyBin(): string {
  return path.join(
    root,
    "node_modules",
    "concurrently",
    "dist",
    "bin",
    "concurrently.js",
  );
}

async function waitForOpenBack(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch("http://localhost:9000/");
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("OpenBack did not start on port 9000.");
}

function stopChild(child: ChildProcess | null): void {
  if (child && !child.killed) child.kill();
}

await ensureCloudflared();

const localServer = spawn(
  process.execPath,
  [concurrentlyBin(), "npm run start:client", "npm run start:server-dev"],
  {
    cwd: root,
    env: {
      ...process.env,
      GAME_ENV: "dev",
      VITE_HOST: "lan",
      SKIP_BROWSER_OPEN: "true",
    },
    stdio: "inherit",
  },
);

await waitForOpenBack();

const tunnel = spawn(
  cloudflaredPath,
  ["tunnel", "--url", "http://localhost:9000", "--no-autoupdate"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);

let announcedUrl = false;
const handleTunnelOutput = (data: Buffer) => {
  const output = data.toString();
  const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (match && !announcedUrl) {
    announcedUrl = true;
    console.log(`\nOpenBack public website: ${match[0]}\n`);
  }
};
tunnel.stdout.on("data", handleTunnelOutput);
tunnel.stderr.on("data", handleTunnelOutput);

const stop = () => {
  stopChild(tunnel);
  stopChild(localServer);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
tunnel.once("exit", (code) => {
  stopChild(localServer);
  process.exitCode = code ?? 1;
});
