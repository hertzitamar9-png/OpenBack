import * as dotenv from "dotenv";
import cluster from "node:cluster";
import { startHostedProxy } from "./HostedProxy";
import { startMaster } from "./Master";
import { ServerEnv } from "./ServerEnv";
import { startWorker } from "./Worker";

dotenv.config();

// Deno Deploy identifies revisions itself, while the existing server expects a
// commit label for diagnostics and commit.txt.
process.env.GIT_COMMIT ??=
  process.env.DENO_DEPLOY_BUILD_ID ??
  process.env.DENO_DEPLOYMENT_ID ??
  "hosted";

async function main() {
  if (cluster.isPrimary) {
    const publicPort = Number.parseInt(process.env.PORT ?? "8000", 10);
    startHostedProxy(publicPort, ServerEnv.numWorkers());
    await startMaster();
  } else {
    await startWorker();
  }
}

main().catch((error) => {
  console.error("Failed to start hosted OpenBack server:", error);
  process.exit(1);
});
