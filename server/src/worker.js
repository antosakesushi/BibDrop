import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./db.js";
import { createResearchWorker, closeQueueConnections } from "./queue/researchQueue.js";
import { createAlertsWorker, scheduleAlertJobs, closeAlertsQueue } from "./queue/alertsQueue.js";
import { processSnapshot } from "./services/researchJobs.js";

if (!process.env.REDIS_URL) {
  console.error(
    "[worker] REDIS_URL is not set. The research worker cannot start. Set REDIS_URL (see .env.example)."
  );
  process.exit(1);
}

let researchWorker;
let alertsWorker;

async function shutdown(signal) {
  console.log(`[worker] ${signal} received, shutting down`);
  try {
    if (researchWorker) await researchWorker.close();
    if (alertsWorker) await alertsWorker.close();
    await closeAlertsQueue();
    await closeQueueConnections();
    await mongoose.disconnect();
  } catch (err) {
    console.error("[worker] shutdown error:", err.message);
  }
  process.exit(0);
}

connectDB()
  .then(async () => {
    researchWorker = createResearchWorker(async ({ snapshotId, raceSlug }) => {
      try {
        await processSnapshot(snapshotId, raceSlug);
      } catch (err) {
        console.error("[worker] research job failed:", err.message);
      }
    });

    alertsWorker = createAlertsWorker();
    alertsWorker.on("failed", (job, err) => {
      console.error("[worker] alerts job failed", job?.name, err.message);
    });

    try {
      await scheduleAlertJobs();
    } catch (err) {
      console.error("[worker] could not schedule repeatable alert jobs:", err.message);
    }

    researchWorker.on("ready", () => {
      console.log("[worker] BibDrop research worker listening for jobs");
    });
    researchWorker.on("failed", (job, err) => {
      console.error("[worker] job failed", job?.id, err.message);
    });
    alertsWorker.on("ready", () => {
      console.log("[worker] BibDrop alerts worker listening for jobs");
    });

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("[worker] Failed to start:", err.message);
    process.exit(1);
  });
