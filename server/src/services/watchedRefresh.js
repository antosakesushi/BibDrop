import { Race } from "../models/Race.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { requestResearchJob } from "./researchJobs.js";
import { getResearchBudgetDecision } from "../middleware/rateLimiter.js";
import { QueueUnavailableError } from "../queue/researchQueue.js";

/**
 * Light refresh: only races with ≥1 watching user, and only if the snapshot
 * is stale beyond the TTL. Still respects the daily research budget.
 */
export async function refreshWatchedRaces() {
  const slugs = await UserRaceStatus.distinct("raceSlug", { interestStage: "watching" });
  let enqueued = 0;
  let skipped = 0;

  for (const slug of slugs) {
    const race = await Race.findOne({ slug });
    if (!race) {
      skipped += 1;
      continue;
    }
    try {
      const { deduped } = await requestResearchJob({
        race,
        userId: undefined,
        ip: "watched-refresh",
        triggeredBy: "system",
        assertBudget: async () => {
          const decision = await getResearchBudgetDecision("watched-refresh");
          if (!decision.ok) {
            const err = new Error(decision.error);
            err.statusCode = decision.status;
            throw err;
          }
        },
      });
      if (!deduped) enqueued += 1;
      else skipped += 1;
    } catch (err) {
      if (err instanceof QueueUnavailableError || err.statusCode === 429) {
        console.warn("[watched-refresh] stopping early:", err.message);
        break;
      }
      console.warn("[watched-refresh] skip", slug, err.message);
      skipped += 1;
    }
  }

  return { watchingRaces: slugs.length, enqueued, skipped };
}
