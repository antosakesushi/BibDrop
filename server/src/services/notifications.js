import { Race } from "../models/Race.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { Notification } from "../models/Notification.js";
export async function notifyWatchers(raceSlug, notification) {
  const watchers = await UserRaceStatus.find({
    raceSlug,
    interestStage: "watching",
    entryOutcome: { $ne: "registered" },
  }).select("userId");
  for (const watcher of watchers) {
    await Notification.updateOne(
      { userId: watcher.userId, key: notification.key },
      { $setOnInsert: { ...notification, userId: watcher.userId, raceSlug } },
      { upsert: true },
    );
  }
}

export async function flushRaceAlerts(slug) {
  const race = await Race.findOne({ slug }).select("+pendingAlerts");
  for (const alert of race?.pendingAlerts || []) {
    await notifyWatchers(slug, {
      key: alert.key,
      title: alert.title,
      body: alert.body,
      sourceUrl: alert.sourceUrl,
    });
    await Race.updateOne(
      { slug },
      { $pull: { pendingAlerts: { key: alert.key } } },
    );
  }
}
