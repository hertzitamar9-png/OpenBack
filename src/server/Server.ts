import * as dotenv from "dotenv";
import cluster from "node:cluster";

// Load environment variables before we read configuration values derived from them.
dotenv.config();

// Main entry point of the application
async function main() {
  // Check if this is the primary (master) process
  if (cluster.isPrimary) {
    console.log("Starting master process...");
    const { startMaster, stopMaster } = await import("./Master");
    await startMaster();
    let stopping = false;
    const handleShutdown = (signal: NodeJS.Signals) => {
      if (stopping) return;
      stopping = true;
      console.log(`Received ${signal}; flushing permanent player data...`);
      void stopMaster()
        .then(() => process.exit(0))
        .catch((error) => {
          console.error("Failed to flush permanent player data:", error);
          process.exit(1);
        });
    };
    process.once("SIGTERM", handleShutdown);
    process.once("SIGINT", handleShutdown);
  } else {
    // This is a worker process
    console.log("Starting worker process...");
    const { startWorker } = await import("./Worker");
    await startWorker();
  }
}

// Start the application
main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
