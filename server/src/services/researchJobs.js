import { Race } from "../models/Race.js";
import { ResearchLog } from "../models/ResearchLog.js";
import { ResearchSnapshot } from "../models/ResearchSnapshot.js";
import { researchRace, EVENT_TYPES } from "./claudeResearch.js";
import {
  QueueUnavailableError,
  assertRedisReady,
  enqueueResearchJob,
  isSyncFallbackEnabled,
} from "../queue/researchQueue.js";

const CONFIDENCE_VALUES = ["low", "medium", "high"];
const DATE_CONFIDENCE_VALUES = ["confirmed", "estimated", "unknown"];

export function snapshotTtlMs() {
  const hours = Number(process.env.RESEARCH_SNAPSHOT_TTL_HOURS || 12);
  return hours * 60 * 60 * 1000;
}

export function isFreshSucceededSnapshot(snapshot, now = Date.now(), ttlMs = snapshotTtlMs()) {
  if (!snapshot || snapshot.status !== "succeeded" || !snapshot.finishedAt) return false;
  return new Date(snapshot.finishedAt).getTime() >= now - ttlMs;
}

export function validateResearchPayload(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Research result was empty.");
  }

  const agentSummary = typeof input.agentSummary === "string" ? input.agentSummary.trim() : "";
  if (!agentSummary) {
    throw new Error("Research result missing agentSummary.");
  }

  if (!CONFIDENCE_VALUES.includes(input.confidence)) {
    throw new Error("Research result has invalid confidence.");
  }

  if (!Array.isArray(input.registrationEvents)) {
    throw new Error("Research result missing registrationEvents.");
  }

  const registrationEvents = input.registrationEvents.map((event, index) => {
    if (!event || typeof event !== "object") {
      throw new Error(`registrationEvents[${index}] is invalid.`);
    }
    if (!EVENT_TYPES.includes(event.type)) {
      throw new Error(`registrationEvents[${index}] has an invalid type.`);
    }
    const dateConfidence = event.dateConfidence || "unknown";
    if (!DATE_CONFIDENCE_VALUES.includes(dateConfidence)) {
      throw new Error(`registrationEvents[${index}] has an invalid dateConfidence.`);
    }
    return {
      type: event.type,
      label: typeof event.label === "string" ? event.label : "",
      date: event.date ? new Date(event.date) : null,
      dateConfidence,
      notes: typeof event.notes === "string" ? event.notes : "",
    };
  });

  const sourceSnippets = Array.isArray(input.sourceSnippets)
    ? input.sourceSnippets.filter((s) => typeof s === "string")
    : [];

  const sources = Array.isArray(input.sources)
    ? input.sources
        .filter((s) => s && typeof s.url === "string" && s.url.trim())
        .map((s) => ({ url: s.url.trim(), title: typeof s.title === "string" ? s.title : "" }))
    : [];

  return {
    agentSummary,
    confidence: input.confidence,
    registrationEvents,
    sourceSnippets,
    sources,
    model: typeof input.model === "string" ? input.model : undefined,
    usage:
      input.usage && typeof input.usage === "object"
        ? {
            inputTokens: Number(input.usage.inputTokens) || 0,
            outputTokens: Number(input.usage.outputTokens) || 0,
          }
        : undefined,
  };
}

export function applyResearchToRace(race, result) {
  race.registrationEvents = result.registrationEvents;
  race.agentSummary = result.agentSummary;
  race.lastResearchConfidence = result.confidence;
  race.lastResearchedAt = new Date();
  race.researchSourceSnippets = result.sourceSnippets;
  return race;
}

export function serializeSnapshot(snapshot) {
  if (!snapshot) return null;
  const obj = typeof snapshot.toObject === "function" ? snapshot.toObject() : snapshot;
  return {
    snapshotId: String(obj._id),
    raceSlug: obj.raceSlug,
    raceId: obj.raceId ? String(obj.raceId) : undefined,
    status: obj.status,
    triggeredBy: obj.triggeredBy,
    agentSummary: obj.agentSummary || null,
    confidence: obj.confidence || null,
    registrationEvents: obj.registrationEvents || [],
    sourceSnippets: obj.sourceSnippets || [],
    sources: obj.sources || [],
    errorMessage: obj.errorMessage || null,
    model: obj.model || null,
    usage: obj.usage || null,
    startedAt: obj.startedAt || null,
    finishedAt: obj.finishedAt || null,
    createdAt: obj.createdAt || null,
  };
}

export async function findReusableSnapshot(raceSlug) {
  const cutoff = new Date(Date.now() - snapshotTtlMs());
  return ResearchSnapshot.findOne({
    raceSlug,
    status: "succeeded",
    finishedAt: { $gte: cutoff },
  }).sort({ finishedAt: -1 });
}

export async function findInFlightSnapshot(raceSlug) {
  return ResearchSnapshot.findOne({
    raceSlug,
    status: { $in: ["queued", "running"] },
  }).sort({ createdAt: -1 });
}

async function markSnapshotFailed(snapshot, errorMessage) {
  snapshot.status = "failed";
  snapshot.errorMessage = errorMessage;
  snapshot.finishedAt = new Date();
  if (!snapshot.startedAt) snapshot.startedAt = snapshot.finishedAt;
  await snapshot.save();
  return snapshot;
}

/**
 * Runs Claude against a registry Race loaded by slug, then writes the snapshot
 * and denormalized Race fields. Called from the worker (and the documented
 * local RESEARCH_SYNC_FALLBACK path only).
 */
export async function processSnapshot(snapshotId, raceSlug) {
  const snapshot = await ResearchSnapshot.findById(snapshotId);
  if (!snapshot) {
    throw new Error(`ResearchSnapshot ${snapshotId} not found.`);
  }
  if (snapshot.raceSlug !== raceSlug) {
    throw new Error("Job raceSlug does not match the snapshot — refusing to run.");
  }
  if (snapshot.status === "succeeded" || snapshot.status === "failed") {
    return snapshot;
  }

  snapshot.status = "running";
  snapshot.startedAt = new Date();
  await snapshot.save();

  try {
    const race = await Race.findOne({ slug: raceSlug });
    if (!race) {
      throw new Error("Race is not in the registry — research only runs against seeded races.");
    }

    const raw = await researchRace(race);
    const result = validateResearchPayload(raw);

    applyResearchToRace(race, result);
    await race.save();

    snapshot.status = "succeeded";
    snapshot.agentSummary = result.agentSummary;
    snapshot.confidence = result.confidence;
    snapshot.registrationEvents = result.registrationEvents;
    snapshot.sourceSnippets = result.sourceSnippets;
    snapshot.sources = result.sources;
    snapshot.model = result.model;
    snapshot.usage = result.usage;
    snapshot.errorMessage = undefined;
    snapshot.finishedAt = new Date();
    await snapshot.save();
    return snapshot;
  } catch (err) {
    await markSnapshotFailed(snapshot, err.message);
    throw err;
  }
}

export async function requestResearchJob({ race, userId, ip, triggeredBy = "user", assertBudget }) {
  const reusable = await findReusableSnapshot(race.slug);
  if (reusable) {
    return { snapshot: reusable, deduped: true };
  }

  const inFlight = await findInFlightSnapshot(race.slug);
  if (inFlight) {
    return { snapshot: inFlight, deduped: true };
  }

  if (assertBudget) await assertBudget();

  let useSyncFallback = false;
  try {
    await assertRedisReady();
  } catch (err) {
    if (err instanceof QueueUnavailableError && isSyncFallbackEnabled()) {
      useSyncFallback = true;
      console.warn(
        "[research] Redis unavailable; RESEARCH_SYNC_FALLBACK=true so this request will run Claude in-process. Do not use this on Render/production."
      );
    } else {
      throw err;
    }
  }

  let snapshot;
  try {
    snapshot = await ResearchSnapshot.create({
      raceSlug: race.slug,
      raceId: race._id,
      status: "queued",
      triggeredBy,
      requesterUserId: userId,
      requesterIp: ip || "unknown",
    });
  } catch (err) {
    if (err?.code === 11000) {
      const existing = await findInFlightSnapshot(race.slug);
      if (existing) return { snapshot: existing, deduped: true };
    }
    throw err;
  }

  await ResearchLog.create({
    raceSlug: race.slug,
    requesterIp: ip || "unknown",
    succeeded: true,
  });

  if (useSyncFallback) {
    try {
      const finished = await processSnapshot(snapshot._id.toString(), race.slug);
      return { snapshot: finished, deduped: false };
    } catch {
      const failed = await ResearchSnapshot.findById(snapshot._id);
      return { snapshot: failed, deduped: false };
    }
  }

  try {
    await enqueueResearchJob({
      snapshotId: snapshot._id.toString(),
      raceSlug: race.slug,
    });
    return { snapshot, deduped: false };
  } catch (err) {
    await markSnapshotFailed(snapshot, err.message);
    throw err;
  }
}
