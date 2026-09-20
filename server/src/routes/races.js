import { Router } from "express";
import { Race } from "../models/Race.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { getResearchBudgetDecision } from "../middleware/rateLimiter.js";
import { findReusableSnapshot, requestResearchJob } from "../services/researchJobs.js";
import { ensureDeadlinesFromLatestSnapshot } from "../services/deadlineStore.js";
import { refreshAlertsForUserRace } from "../services/alerts.js";

export const racesRouter = Router();

// Merges each user's personal interestStage onto the shared race list.
// Logged-out visitors just see "none" for everything - the catalog itself
// is public, only the personal status is gated.
async function attachInterestStage(races, userId) {
  if (!userId) {
    return races.map((r) => ({ ...r.toObject(), interestStage: "none" }));
  }
  const statuses = await UserRaceStatus.find({ userId, raceSlug: { $in: races.map((r) => r.slug) } });
  const statusBySlug = Object.fromEntries(statuses.map((s) => [s.raceSlug, s.interestStage]));
  return races.map((r) => ({ ...r.toObject(), interestStage: statusBySlug[r.slug] || "none" }));
}

// List all races (dashboard + calendar views read from this)
racesRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const races = await Race.find().sort({ name: 1 });
    res.json(await attachInterestStage(races, req.userId));
  } catch (err) {
    next(err);
  }
});

// Single race detail
racesRouter.get("/:slug", optionalAuth, async (req, res, next) => {
  try {
    const race = await Race.findOne({ slug: req.params.slug });
    if (!race) return res.status(404).json({ error: "Race not found" });
    const [withStatus] = await attachInterestStage([race], req.userId);
    res.json(withStatus);
  } catch (err) {
    next(err);
  }
});

// Very simple goal-matching endpoint: given a goal tag (e.g. "bq-friendly"),
// rank races that have been researched.
racesRouter.get("/match/:goalTag", optionalAuth, async (req, res, next) => {
  try {
    const races = await Race.find({
      tags: req.params.goalTag,
      lastResearchConfidence: { $ne: "not_yet_researched" },
    }).sort({ lastResearchedAt: -1 });
    res.json(await attachInterestStage(races, req.userId));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/races/:slug/interest - moves a race between the journey
// stages (none -> interested -> watching), private to the logged-in user.
// Requires auth now that this is per-account, not a shared field on Race.
racesRouter.patch("/:slug/interest", requireAuth, async (req, res, next) => {
  try {
    const { stage } = req.body;
    if (!["none", "interested", "watching"].includes(stage)) {
      return res.status(400).json({ error: "stage must be one of: none, interested, watching" });
    }
    const race = await Race.findOne({ slug: req.params.slug });
    if (!race) return res.status(404).json({ error: "Race not found" });

    await UserRaceStatus.findOneAndUpdate(
      { userId: req.userId, raceSlug: req.params.slug },
      { interestStage: stage },
      { upsert: true }
    );

    if (stage === "watching") {
      await ensureDeadlinesFromLatestSnapshot(race);
      const fresh = await findReusableSnapshot(race.slug);
      if (!fresh) {
        try {
          await requestResearchJob({
            race,
            userId: req.userId,
            ip: req.ip || "unknown",
            triggeredBy: "user",
            assertBudget: async () => {
              const decision = await getResearchBudgetDecision(req.ip || "unknown");
              if (!decision.ok) {
                const err = new Error(decision.error);
                err.statusCode = decision.status;
                throw err;
              }
            },
          });
        } catch (err) {
          console.warn("[watch] could not enqueue freshness research:", err.message);
        }
      }
      await refreshAlertsForUserRace({
        userId: req.userId,
        interestStage: "watching",
        race,
      });
    } else {
      await refreshAlertsForUserRace({
        userId: req.userId,
        interestStage: stage,
        race,
      });
    }

    res.json({ ...race.toObject(), interestStage: stage });
  } catch (err) {
    next(err);
  }
});
