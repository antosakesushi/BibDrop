import { Race } from "../models/Race.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { ResearchLog } from "../models/ResearchLog.js";
import { refreshRace } from "../services/refreshRace.js";
import { notifyWatchers, flushRaceAlerts } from "../services/notifications.js";
import { reminders } from "../lib/monitoring.js";
let running = false;
const health = { lastStartedAt: null, lastCompletedAt: null, lastError: null };
export function getMonitorStatus() {
  return {
    enabled: process.env.MONITORING_ENABLED === "true",
    running,
    ...health,
    channel: "in_app",
    baselineDays: 7,
    nearWindowDays: 1,
    emailEnabled: false,
  };
}
export async function monitorTick({ refresh = refreshRace } = {}) {
  if (running) return;
  running = true;
  health.lastStartedAt = new Date();
  health.lastError = null;
  try {
    const slugs = await UserRaceStatus.distinct("raceSlug", {
      interestStage: "watching",
      entryOutcome: { $ne: "registered" },
    });
    const races = await Race.find({ slug: { $in: slugs } });
    for (const race of races) {
      try {
        await flushRaceAlerts(race.slug);
        // Reminder delivery is independent of whether research is due or succeeds.
        for (const reminder of reminders(race))
          await notifyWatchers(race.slug, reminder);
        if (race.nextResearchAt && race.nextResearchAt > new Date()) continue;
        const count = await ResearchLog.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 86400000) },
        });
        if (count >= Number(process.env.RESEARCH_DAILY_BUDGET_CAP || 50))
          continue;
        await refresh(race.slug);
      } catch (e) {
        health.lastError =
          "A race check failed; previous findings were retained.";
        console.error("[monitor] Race check failed:", race.slug, e.message);
      }
    }
  } catch (e) {
    health.lastError = "Monitoring could not complete its latest cycle.";
    throw e;
  } finally {
    health.lastCompletedAt = new Date();
    running = false;
  }
}
export function startMonitor() {
  if (process.env.MONITORING_ENABLED !== "true") return;
  const run = () =>
    monitorTick().catch((e) => console.error("[monitor]", e.message));
  run();
  const timer = setInterval(run, 60000);
  timer.unref();
  return timer;
}
