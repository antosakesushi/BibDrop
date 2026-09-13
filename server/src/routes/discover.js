import { findExistingRace } from "../lib/raceIdentity.js";
import { optionalAuth } from "../middleware/auth.js";
import { attachInterestStage } from "./races.js";
import { Router } from "express";
import { Race } from "../models/Race.js";
import { DiscoveryLog } from "../models/DiscoveryLog.js";
import { discoverRaces } from "../services/raceDiscovery.js";
import { validateDiscoveryInput, safeHttpUrl } from "../lib/discoveryInput.js";
import { discoveryRateLimiter } from "../middleware/discoveryRateLimiter.js";

export const discoverRouter = Router();

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

  const invalid = validateDiscoveryInput(req.body);
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const result = await discoverRaces(
      criteria.trim(),
      req.body.messages || [],
    );
    const catalog = await Race.find().select("slug name officialUrl");
    result.candidates = result.candidates.map((candidate) => {
      const existing = findExistingRace(catalog, candidate);
      return existing ? { ...candidate, slug: existing.slug } : candidate;
    });
    const candidates = result.candidates;
    await DiscoveryLog.create({
      requesterIp: ip,
      criteria: criteria.trim(),
      candidateCount: candidates.length,
      succeeded: true,
    });
    res.json(result);
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
discoverRouter.post("/confirm", optionalAuth, async (req, res, next) => {
  try {
    const { name, officialUrl, city, country, courseType, season, tags } =
      req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 200 ||
      !safeHttpUrl(officialUrl)
    ) {
      return res
        .status(400)
        .json({ error: "name and officialUrl are required." });
    }

    const slug = slugify(name);
    const existing = findExistingRace(await Race.find(), { name, officialUrl });
    if (existing) {
      return res.json((await attachInterestStage([existing], req.userId))[0]);
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
