import { Router } from "express";
import { Race } from "../models/Race.js";
import { ResearchLog } from "../models/ResearchLog.js";
import { researchRace } from "../services/claudeResearch.js";
import { researchRateLimiter } from "../middleware/rateLimiter.js";

export const researchRouter = Router();

// POST /api/research/:slug - the "Research this race" button's endpoint.
// Rate-limited (see middleware/rateLimiter.js) since this is the one route
// that spends Anthropic API credits on every call.
researchRouter.post("/:slug", researchRateLimiter, async (req, res, next) => {
  const { slug } = req.params;
  const ip = req.ip;

  try {
    const race = await Race.findOne({ slug });
    if (!race) return res.status(404).json({ error: "Race not found" });

    const result = await researchRace(race);

    race.registrationEvents = (result.registrationEvents || []).map((e) => ({
      ...e,
      date: e.date ? new Date(e.date) : null,
    }));
    race.agentSummary = result.agentSummary;
    race.lastResearchConfidence = result.confidence || "low";
    race.lastResearchedAt = new Date();
    race.researchSourceSnippets = result.sourceSnippets || [];
    await race.save();

    await ResearchLog.create({ raceSlug: slug, requesterIp: ip, succeeded: true });

    res.json(race);
  } catch (err) {
    await ResearchLog.create({
      raceSlug: slug,
      requesterIp: ip,
      succeeded: false,
      errorMessage: err.message,
    });
    next(err);
  }
});
