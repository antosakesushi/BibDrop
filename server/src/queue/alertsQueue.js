import { Queue, Worker } from "bullmq";
import { getRedis, assertRedisReady } from "./researchQueue.js";
import { scanDueAlerts } from "../services/alerts.js";
import { refreshWatchedRaces } from "../services/watchedRefresh.js";

export const ALERTS_QUEUE_NAME = "alerts";

let alertsQueue;

export function getAlertsQueue() {
  if (!alertsQueue) {
    alertsQueue = new Queue(ALERTS_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
  }
  return alertsQueue;
}

export async function scheduleAlertJobs() {
  await assertRedisReady();
  const queue = getAlertsQueue();
  await queue.upsertJobScheduler(
    "scan-due-alerts",
    { every: 60 * 60 * 1000 },
    { name: "scan-due-alerts", data: {} }
  );
  await queue.upsertJobScheduler(
    "refresh-watched-races",
    { every: 6 * 60 * 60 * 1000 },
    { name: "refresh-watched-races", data: {} }
  );
  console.log("[alerts] scheduled hourly due-scan and 6h watched-race refresh");
}

export function createAlertsWorker() {
  return new Worker(
    ALERTS_QUEUE_NAME,
    async (job) => {
      if (job.name === "scan-due-alerts") {
        const result = await scanDueAlerts();
        console.log("[alerts] scan-due-alerts", result);
        return result;
      }
      if (job.name === "refresh-watched-races") {
        const result = await refreshWatchedRaces();
        console.log("[alerts] refresh-watched-races", result);
        return result;
      }
    },
    {
      connection: getRedis().duplicate(),
      concurrency: 1,
    }
  );
}

export async function closeAlertsQueue() {
  if (alertsQueue) {
    await alertsQueue.close();
    alertsQueue = undefined;
  }
}
