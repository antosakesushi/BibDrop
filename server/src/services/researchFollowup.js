import { materializeDeadlinesFromSnapshot } from "./deadlineStore.js";
import { refreshAlertsForRace } from "./alerts.js";

/**
 * After a snapshot succeeds, Race denorm is already saved. Turn events into
 * current Deadlines and fan out Alert upserts for watching users only.
 */
export async function afterSnapshotSucceeded(snapshot, race) {
  try {
    await materializeDeadlinesFromSnapshot(snapshot, race);
    await refreshAlertsForRace(race.slug);
  } catch (err) {
    console.error(
      "[research] snapshot succeeded but deadline/alert follow-up failed:",
      err.message
    );
  }
}
