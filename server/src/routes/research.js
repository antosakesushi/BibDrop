import { Router } from "express";
import mongoose from "mongoose";
import { Race } from "../models/Race.js";
import { ResearchSnapshot } from "../models/ResearchSnapshot.js";
import { requireAuth } from "../middleware/auth.js";
import { getResearchBudgetDecision } from "../middleware/rateLimiter.js";
import { requestResearchJob, serializeSnapshot } from "../services/researchJobs.js";
import { QueueUnavailableError } from "../queue/researchQueue.js";

export const researchRouter = Router();

function jobAcceptedPayload(snapshot) {
  return {
    snapshotId: String(snapshot._id),
    status: snapshot.status,
  };
}

function budgetError(decision) {
  const err = new Error(decision.error);
  err.statusCode = decision.status;
  return err;
}

// GET /api/research/jobs/:snapshotId — poll status + results when succeeded.
researchRouter.get("/jobs/:snapshotId", requireAuth, async (req, res, next) => {
  try {
    const { snapshotId } = req.params;
    if (!mongoose.isValidObjectId(snapshotId)) {
      return res.status(404).json({ error: "Research job not found" });
    }

    const snapshot = await ResearchSnapshot.findById(snapshotId);
    if (!snapshot) return res.status(404).json({ error: "Research job not found" });

    res.json(serializeSnapshot(snapshot));
  } catch (err) {
    next(err);
  }
});

// POST /api/research/:slug — auth + rate/budget (on new Claude spend) + registry
// check, then enqueue. Returns 202 immediately; the worker runs Claude.
researchRouter.post("/:slug", requireAuth, async (req, res, next) => {
  const { slug } = req.params;
  const ip = req.ip || "unknown";

  try {
    const race = await Race.findOne({ slug });
    if (!race) return res.status(404).json({ error: "Race not found" });

    const { snapshot } = await requestResearchJob({
      race,
      userId: req.userId,
      ip,
      triggeredBy: "user",
      assertBudget: async () => {
        const decision = await getResearchBudgetDecision(ip);
        if (!decision.ok) throw budgetError(decision);
      },
    });

    res.status(202).json(jobAcceptedPayload(snapshot));
  } catch (err) {
    if (err instanceof QueueUnavailableError || err.statusCode) {
      return res.status(err.statusCode || 503).json({ error: err.message });
    }
    next(err);
  }
});
