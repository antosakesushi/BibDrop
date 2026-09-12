import { Router } from "express";
import { Race } from "../models/Race.js";

export const racesRouter = Router();

// List all races (dashboard + calendar views read from this)
racesRouter.get("/", async (req, res, next) => {
  try {
    const races = await Race.find().sort({ name: 1 });
    res.json(races);
  } catch (err) {
    next(err);
  }
});

// Single race detail
racesRouter.get("/:slug", async (req, res, next) => {
  try {
    const race = await Race.findOne({ slug: req.params.slug });
    if (!race) return res.status(404).json({ error: "Race not found" });
    res.json(race);
  } catch (err) {
    next(err);
  }
});

// Very simple goal-matching endpoint: given a goal tag (e.g. "bq-friendly"),
// rank races that have been researched. This is intentionally simple for
// v1 - the PRD's fuller matching logic (course profile + timing + user goal
// time) is a good next iteration once real research data exists to match against.
racesRouter.get("/match/:goalTag", async (req, res, next) => {
  try {
    const races = await Race.find({
      tags: req.params.goalTag,
      lastResearchConfidence: { $ne: "not_yet_researched" },
    }).sort({ lastResearchedAt: -1 });
    res.json(races);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/races/:slug/interest - moves a race between the journey
// stages (none -> interested -> watching). This is a plain state update,
// not an agent action, so it isn't rate-limited the way research/discovery
// are - it costs nothing and carries no abuse risk.
racesRouter.patch("/:slug/interest", async (req, res, next) => {
  try {
    const { stage } = req.body;
    if (!["none", "interested", "watching"].includes(stage)) {
      return res.status(400).json({ error: "stage must be one of: none, interested, watching" });
    }
    const race = await Race.findOneAndUpdate(
      { slug: req.params.slug },
      { interestStage: stage },
      { new: true }
    );
    if (!race) return res.status(404).json({ error: "Race not found" });
    res.json(race);
  } catch (err) {
    next(err);
  }
});
