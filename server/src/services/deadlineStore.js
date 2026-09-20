import { ResearchSnapshot } from "../models/ResearchSnapshot.js";
import { Deadline } from "../models/Deadline.js";
import { buildDeadlineRecords, planDeadlineSupersede } from "./deadlines.js";

export async function materializeDeadlinesFromSnapshot(snapshot, race) {
  const previous = await Deadline.find({ raceSlug: race.slug, isCurrent: true });
  const records = buildDeadlineRecords(snapshot.registrationEvents, {
    raceId: race._id,
    raceSlug: race.slug,
    snapshotId: snapshot._id,
  });

  let created = [];
  if (records.length > 0) {
    created = await Deadline.insertMany(records);
  }

  const closures = planDeadlineSupersede(previous, created);
  for (const { previous: old, successorIndex } of closures) {
    old.isCurrent = false;
    old.supersededBy = successorIndex == null ? null : created[successorIndex]._id;
    await old.save();
  }

  return created;
}

export async function ensureDeadlinesFromLatestSnapshot(race) {
  const existing = await currentDeadlinesForRace(race.slug);
  if (existing.length) return existing;
  const snapshot = await ResearchSnapshot.findOne({
    raceSlug: race.slug,
    status: "succeeded",
  }).sort({ finishedAt: -1 });
  if (!snapshot) return [];
  return materializeDeadlinesFromSnapshot(snapshot, race);
}

export async function currentDeadlinesForRace(raceSlug) {
  return Deadline.find({ raceSlug, isCurrent: true }).sort({ date: 1 });
}

export function serializeDeadline(deadline) {
  const obj = typeof deadline.toObject === "function" ? deadline.toObject() : deadline;
  return {
    id: String(obj._id),
    raceId: obj.raceId ? String(obj.raceId) : undefined,
    raceSlug: obj.raceSlug,
    snapshotId: obj.snapshotId ? String(obj.snapshotId) : undefined,
    type: obj.type,
    label: obj.label || "",
    date: obj.date || null,
    dateConfidence: obj.dateConfidence || "unknown",
    notes: obj.notes || "",
    isCurrent: obj.isCurrent !== false,
  };
}
