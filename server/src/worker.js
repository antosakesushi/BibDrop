import "dotenv/config";
import { connectDB } from "./db.js";
import { createResearchWorker, closeQueueConnections } from "./queue/researchQueue.js";
import { processSnapshot } from "./services/researchJobs.js";
import mongoose from "mongoose";

if (!process.env.REDIS_URL) {
  console.error(
    "[worker] REDIS_URL is not set. The research worker cannot start. Set REDIS_URL (see .env.example)."
  );
  process.exit(1);
}

let worker;

async function shutdown(signal) {
  console.log(`[worker] ${signal} received, shutting down`);
  try {
    if (worker) await worker.close();
    await closeQueueConnections();
    await mongoose.disconnect();
  } catch (err) {
    console.error("[worker] shutdown error:", err.message);
  }
  process.exit(0);
}

connectDB()
  .then(() => {
    worker = createResearchWorker(async ({ snapshotId, raceSlug }) => {
      try {
        await processSnapshot(snapshotId, raceSlug);
      } catch (err) {
        // Snapshot is already marked failed inside processSnapshot when possible.
        console.error("[worker] research job failed:", err.message);
      }
    });

    worker.on("ready", () => {
      console.log("[worker] BibDrop research worker listening for jobs");
    });
    worker.on("failed", (job, err) => {
      console.error("[worker] job failed", job?.id, err.message);
    });

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("[worker] Failed to start:", err.message);
    process.exit(1);
  });
