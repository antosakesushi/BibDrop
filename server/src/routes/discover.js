import { Router } from "express";
import { Race } from "../models/Race.js";
import { DiscoveryLog } from "../models/DiscoveryLog.js";
import { discoverRaces } from "../services/raceDiscovery.js";
import { discoveryRateLimiter } from "../middleware/discoveryRateLimiter.js";

export const discoverRouter = Router();

const MAX_CRITERIA_LENGTH = 300;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// POST /api/discover - runs the discovery agent, returns candidates for
// the user to review. Does NOT save anything to the database - that's a
// separate, explicit step (POST /api/discover/confirm below), matching the
// human-in-the-loop principle from the product docs.
discoverRouter.post("/", discoveryRateLimiter, async (req, res, next) => {
  const { criteria } = req.body;
  const ip = req.ip;

  if (!criteria || typeof criteria !== "string" || !criteria.trim()) {
    return res.status(400).json({ error: "Criteria text is required." });
  }
  if (criteria.length > MAX_CRITERIA_LENGTH) {
    return res.status(400).json({ error: `Criteria must be under ${MAX_CRITERIA_LENGTH} characters.` });
  }

  try {
    const candidates = await discoverRaces(criteria.trim());
    await DiscoveryLog.create({
      requesterIp: ip,
      criteria: criteria.trim(),
      candidateCount: candidates.length,
      succeeded: true,
    });
    res.json({ candidates });
  } catch (err) {
    await DiscoveryLog.create({
      requesterIp: ip,
      criteria: criteria.trim(),
      succeeded: false,
      errorMessage: err.message,
    });
    next(err);
  }
});

// POST /api/discover/confirm - saves ONE reviewed candidate to the
// registry. This is deliberately not part of the discovery call itself -
// nothing is persisted until a human explicitly confirms a specific
// candidate.
discoverRouter.post("/confirm", async (req, res, next) => {
  try {
    const { name, officialUrl, city, country, courseType, season, tags } = req.body;

    if (!name || !officialUrl) {
      return res.status(400).json({ error: "name and officialUrl are required." });
    }

    const slug = slugify(name);
    const existing = await Race.findOne({ slug });
    if (existing) {
      return res.status(409).json({ error: `A race with slug "${slug}" already exists.`, existingSlug: slug });
    }

    const race = await Race.create({
      name,
      slug,
      officialUrl,
      city,
      country,
      courseType,
      season,
      tags: tags || [],
    });

    res.status(201).json(race);
  } catch (err) {
    next(err);
  }
});
