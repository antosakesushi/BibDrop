import { isDeadlineSchedulable } from "./deadlines.js";

export const DEFAULT_LEAD_DAYS = [14, 7, 1];
export const DEFAULT_ALERT_CHANNEL = "email";
export const DEFAULT_ALERT_TIMEZONE = "UTC";

export function shouldCreateAlerts(interestStage) {
  return interestStage === "watching";
}

export function alertDedupeKey({ userId, deadlineId, leadDays, channel }) {
  return `${userId}:${deadlineId}:${leadDays}:${channel}`;
}

export function computeFireAt(deadlineDate, leadDays, now = new Date()) {
  const date = new Date(deadlineDate);
  if (Number.isNaN(date.getTime())) return null;
  const fireAt = new Date(date.getTime() - Number(leadDays) * 24 * 60 * 60 * 1000);
  if (Number.isNaN(fireAt.getTime())) return null;
  // Don't schedule a lead that has already passed.
  if (fireAt.getTime() <= new Date(now).getTime()) return null;
  return fireAt;
}

/**
 * Pure planner: watching-only, skip null/unknown dates, one row per
 * user+deadline+leadDays+channel. Idempotent as long as callers upsert by
 * the returned dedupeKey.
 */
export function planAlertsForWatcher({
  interestStage,
  userId,
  raceId,
  deadlines,
  leadDays = DEFAULT_LEAD_DAYS,
  channel = DEFAULT_ALERT_CHANNEL,
  now = new Date(),
}) {
  if (!shouldCreateAlerts(interestStage)) return [];
  const days = [...new Set((leadDays || DEFAULT_LEAD_DAYS).filter((d) => Number.isFinite(d) && d >= 0))];
  const rows = [];
  for (const deadline of deadlines || []) {
    if (!isDeadlineSchedulable(deadline)) continue;
    for (const lead of days) {
      const fireAt = computeFireAt(deadline.date, lead, now);
      if (!fireAt) continue;
      const deadlineId = deadline._id || deadline.id;
      rows.push({
        userId,
        deadlineId,
        raceId,
        channel,
        leadDays: lead,
        fireAt,
        status: "scheduled",
        dedupeKey: alertDedupeKey({ userId, deadlineId, leadDays: lead, channel }),
      });
    }
  }
  return rows;
}

/**
 * Scanner decision for a due alert. Does not mutate.
 *  - skip: deadline no longer current / unknown / dateless
 *  - noop: provider key missing — leave scheduled so adding a key later sends
 *  - send: attempt delivery
 */
export function decideScanAction({ alert, deadline, hasProvider }) {
  if (!alert || alert.status !== "scheduled") return { action: "ignore" };
  if (!deadline || deadline.isCurrent === false) {
    return { action: "skip", reason: "deadline_not_current" };
  }
  if (!deadline.date || deadline.dateConfidence === "unknown") {
    return { action: "skip", reason: "deadline_unknown" };
  }
  if (!hasProvider) {
    return { action: "noop", reason: "no_provider_key" };
  }
  return { action: "send" };
}

export function urgencyBand(fireAt, now = new Date()) {
  const ms = new Date(fireAt).getTime() - new Date(now).getTime();
  const days = ms / (24 * 60 * 60 * 1000);
  if (days <= 1) return "act_now";
  if (days <= 7) return "this_week";
  return "upcoming";
}
