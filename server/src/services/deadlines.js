import { EVENT_TYPES } from "./claudeResearch.js";

export const DATE_CONFIDENCES = ["confirmed", "estimated", "unknown"];

/**
 * Copy snapshot registration events into Deadline-shaped records.
 * Never invents a date — missing/invalid dates stay null + unknown.
 */
export function buildDeadlineRecords(events, { raceId, raceSlug, snapshotId }) {
  return (events || []).map((event) => {
    const date = event?.date ? new Date(event.date) : null;
    const validDate = date && !Number.isNaN(date.getTime()) ? date : null;
    const dateConfidence = DATE_CONFIDENCES.includes(event?.dateConfidence)
      ? event.dateConfidence
      : "unknown";
    return {
      raceId,
      raceSlug,
      snapshotId,
      type: EVENT_TYPES.includes(event?.type) ? event.type : "other",
      label: typeof event?.label === "string" ? event.label : "",
      date: validDate,
      dateConfidence: validDate ? dateConfidence : "unknown",
      notes: typeof event?.notes === "string" ? event.notes : "",
      isCurrent: true,
      supersededBy: null,
    };
  });
}

/**
 * Prior current rows become not-current. Match successor by type (first unused
 * new row of the same type) so supersededBy points at the replacement.
 */
export function planDeadlineSupersede(previousCurrent, newCurrent) {
  const unused = newCurrent.map((row, index) => ({ row, index }));
  const closures = previousCurrent.map((old) => {
    const matchAt = unused.findIndex((entry) => entry.row.type === old.type);
    let successorIndex = null;
    if (matchAt >= 0) {
      successorIndex = unused[matchAt].index;
      unused.splice(matchAt, 1);
    } else if (newCurrent.length > 0) {
      successorIndex = 0;
    }
    return { previous: old, successorIndex };
  });
  return closures;
}

export function isDeadlineSchedulable(deadline) {
  if (!deadline) return false;
  if (deadline.isCurrent === false) return false;
  if (!deadline.date) return false;
  if (deadline.dateConfidence === "unknown") return false;
  return deadline.dateConfidence === "confirmed" || deadline.dateConfidence === "estimated";
}
