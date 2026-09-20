import { Alert } from "../models/Alert.js";
import { Deadline } from "../models/Deadline.js";
import { Race } from "../models/Race.js";
import { User } from "../models/User.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { planAlertsForWatcher, decideScanAction, DEFAULT_LEAD_DAYS, DEFAULT_ALERT_CHANNEL } from "./alertPlan.js";
import { currentDeadlinesForRace } from "./deadlineStore.js";
import { buildAlertEmail, hasEmailProvider, sendAlertEmail } from "./emailSender.js";

export async function refreshAlertsForRace(raceSlug) {
  const race = await Race.findOne({ slug: raceSlug });
  if (!race) return { upserted: 0, cancelled: 0 };

  const deadlines = await currentDeadlinesForRace(raceSlug);
  const currentIds = deadlines.map((d) => d._id);

  const cancelled = await Alert.updateMany(
    {
      raceId: race._id,
      status: "scheduled",
      deadlineId: { $nin: currentIds },
    },
    { $set: { status: "cancelled" } }
  );

  const watchers = await UserRaceStatus.find({ raceSlug, interestStage: "watching" });
  let upserted = 0;
  for (const watcher of watchers) {
    upserted += await upsertAlertsForWatcher({
      userId: watcher.userId,
      interestStage: watcher.interestStage,
      race,
      deadlines,
    });
  }

  return { upserted, cancelled: cancelled.modifiedCount || 0 };
}

export async function refreshAlertsForUserRace({ userId, interestStage, race }) {
  if (interestStage !== "watching") {
    const result = await Alert.updateMany(
      { userId, raceId: race._id, status: "scheduled" },
      { $set: { status: "cancelled" } }
    );
    return { upserted: 0, cancelled: result.modifiedCount || 0 };
  }

  const deadlines = await currentDeadlinesForRace(race.slug);
  const upserted = await upsertAlertsForWatcher({ userId, interestStage, race, deadlines });
  return { upserted, cancelled: 0 };
}

async function upsertAlertsForWatcher({ userId, interestStage, race, deadlines }) {
  const user = await User.findById(userId);
  const leadDays = user?.alertDefaults?.leadDays?.length
    ? user.alertDefaults.leadDays
    : DEFAULT_LEAD_DAYS;
  const channel = user?.alertDefaults?.channel || DEFAULT_ALERT_CHANNEL;
  const rows = planAlertsForWatcher({
    interestStage,
    userId,
    raceId: race._id,
    deadlines,
    leadDays,
    channel,
  });

  let upserted = 0;
  for (const row of rows) {
    try {
      const existing = await Alert.findOne({ dedupeKey: row.dedupeKey });
      if (!existing) {
        await Alert.create(row);
        upserted += 1;
        continue;
      }
      if (existing.status === "cancelled" || existing.status === "skipped" || existing.status === "failed") {
        existing.status = "scheduled";
        existing.fireAt = row.fireAt;
        existing.errorMessage = undefined;
        await existing.save();
        upserted += 1;
      }
    } catch (err) {
      if (err?.code !== 11000) throw err;
    }
  }
  return upserted;
}

export async function scanDueAlerts({ now = new Date(), limit = 100 } = {}) {
  const due = await Alert.find({ status: "scheduled", fireAt: { $lte: now } })
    .sort({ fireAt: 1 })
    .limit(limit);

  const results = { sent: 0, skipped: 0, failed: 0, noop: 0 };

  for (const alert of due) {
    const deadline = await Deadline.findById(alert.deadlineId);
    const decision = decideScanAction({
      alert,
      deadline,
      hasProvider: hasEmailProvider(),
    });

    if (decision.action === "noop" || decision.action === "ignore") {
      if (decision.action === "noop") {
        console.warn("[alerts] due alert not sent:", decision.reason, String(alert._id));
        results.noop += 1;
      }
      continue;
    }

    if (decision.action === "skip") {
      alert.status = "skipped";
      alert.errorMessage = decision.reason;
      await alert.save();
      results.skipped += 1;
      continue;
    }

    try {
      const [user, race] = await Promise.all([
        User.findById(alert.userId),
        Race.findById(alert.raceId),
      ]);
      const { subject, text } = buildAlertEmail({
        race: race || { name: "a race", officialUrl: "" },
        deadline,
        leadDays: alert.leadDays,
      });
      const sent = await sendAlertEmail({ to: user?.email, subject, text });
      if (sent.skipped) {
        results.noop += 1;
        continue;
      }
      alert.status = "sent";
      alert.sentAt = new Date();
      alert.providerMessageId = sent.providerMessageId;
      alert.errorMessage = undefined;
      await alert.save();
      results.sent += 1;
    } catch (err) {
      alert.status = "failed";
      alert.errorMessage = err.message;
      await alert.save();
      results.failed += 1;
    }
  }

  return results;
}

export function serializeAlert(alert, { deadline, race } = {}) {
  const obj = typeof alert.toObject === "function" ? alert.toObject() : alert;
  return {
    id: String(obj._id),
    status: obj.status,
    channel: obj.channel,
    leadDays: obj.leadDays,
    fireAt: obj.fireAt,
    sentAt: obj.sentAt || null,
    errorMessage: obj.errorMessage || null,
    deadline: deadline
      ? {
          id: String(deadline._id),
          type: deadline.type,
          label: deadline.label || "",
          date: deadline.date || null,
          dateConfidence: deadline.dateConfidence || "unknown",
          isCurrent: deadline.isCurrent !== false,
        }
      : { id: String(obj.deadlineId) },
    race: race
      ? {
          id: String(race._id),
          slug: race.slug,
          name: race.name,
          officialUrl: race.officialUrl,
        }
      : { id: String(obj.raceId) },
  };
}
