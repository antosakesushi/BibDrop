import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

export const RESEARCH_QUEUE_NAME = "research";

export class QueueUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "QueueUnavailableError";
    this.statusCode = 503;
  }
}

export function isSyncFallbackEnabled() {
  return process.env.RESEARCH_SYNC_FALLBACK === "true";
}

let redis;
let queue;

export function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new QueueUnavailableError(
      "Research queue is unavailable (REDIS_URL is not set). Start Redis and set REDIS_URL. For a local demo only you may set RESEARCH_SYNC_FALLBACK=true — that path is not for production."
    );
  }
  if (!redis) {
    redis = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: true,
      connectTimeout: 5000,
    });
    redis.on("error", (err) => {
      console.error("[redis]", err.message);
    });
  }
  return redis;
}

export async function assertRedisReady() {
  let client;
  try {
    client = getRedis();
  } catch (err) {
    if (err instanceof QueueUnavailableError) throw err;
    throw new QueueUnavailableError(
      "Research queue is unavailable (could not configure Redis). Check REDIS_URL."
    );
  }

  try {
    const ping = client.ping();
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Redis ping timed out")), 3000);
    });
    await Promise.race([ping, timeout]);
  } catch (err) {
    throw new QueueUnavailableError(
      "Research queue is unavailable (could not reach Redis). Check REDIS_URL."
    );
  }
}

export function getResearchQueue() {
  if (!queue) {
    queue = new Queue(RESEARCH_QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
  }
  return queue;
}

/**
 * Workers accept registry identity only — never a client-supplied URL.
 * Extra fields on the job (including any URL) are dropped here.
 */
export function buildResearchJobData({ snapshotId, raceSlug }) {
  if (!snapshotId || !raceSlug) {
    throw new Error("Research jobs require snapshotId and raceSlug from the race registry.");
  }
  return {
    snapshotId: String(snapshotId),
    raceSlug: String(raceSlug),
  };
}

export async function enqueueResearchJob({ snapshotId, raceSlug }) {
  await assertRedisReady();
  const data = buildResearchJobData({ snapshotId, raceSlug });
  const q = getResearchQueue();
  try {
    await q.add("research-race", data, {
      // Identity is snapshot + registry slug only. Concurrent refreshes are
      // deduped in requestResearchJob / the in-flight unique index, not by
      // reusing a raceSlug jobId (that would block a legitimate later refresh).
      jobId: `research:${data.raceSlug}:${data.snapshotId}`,
    });
  } catch (err) {
    const message = err?.message || "";
    if (/already exists|duplicat/i.test(message)) {
      return { duplicate: true };
    }
    throw new QueueUnavailableError(
      "Research queue is unavailable (could not enqueue job). Check REDIS_URL and that the worker is running."
    );
  }
  return { duplicate: false };
}

export function createResearchWorker(processor) {
  return new Worker(
    RESEARCH_QUEUE_NAME,
    async (job) => {
      const { snapshotId, raceSlug } = buildResearchJobData(job.data || {});
      await processor({ snapshotId, raceSlug });
    },
    {
      connection: getRedis(),
      concurrency: 2,
    }
  );
}

export async function closeQueueConnections() {
  const closing = [];
  if (queue) closing.push(queue.close());
  if (redis) closing.push(redis.quit());
  await Promise.allSettled(closing);
  queue = undefined;
  redis = undefined;
}
