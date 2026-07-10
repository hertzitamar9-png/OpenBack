import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import path from "node:path";

function getLanAddress(): string | null {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return null;
}

const lanAddress = process.env.OPENBACK_LAN_ADDRESS ?? getLanAddress();
if (!lanAddress) {
  throw new Error(
    "No LAN IPv4 address found. Set OPENBACK_LAN_ADDRESS to your computer's local IP address.",
  );
}

const shareOrigin = `http://${lanAddress}:9000`;
console.log(`OpenBack multiplayer links will use ${shareOrigin}`);

const child = spawn(
  process.execPath,
  [
    path.join(
      process.cwd(),
      "node_modules",
      "concurrently",
      "dist",
      "bin",
      "concurrently.js",
    ),
    "npm run start:client",
    "npm run start:server-dev",
  ],
  {
    env: {
      ...process.env,
      GAME_ENV: "dev",
      VITE_HOST: "lan",
      VITE_SHARE_ORIGIN: shareOrigin,
    },
    stdio: "inherit",
  },
);

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
