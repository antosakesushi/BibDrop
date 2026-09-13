import { DiscoveryLog } from "../models/DiscoveryLog.js";

const PER_IP_LIMIT = Number(
  process.env.DISCOVERY_RATE_LIMIT_PER_IP_PER_HOUR || 10,
);
const DAILY_BUDGET_CAP = Number(process.env.DISCOVERY_DAILY_BUDGET_CAP || 20);

/**
 * Stricter sibling of researchRateLimiter (see rateLimiter.js). Discovery
 * takes open-ended freeform criteria rather than a fixed race slug, so it's
 * both a bigger cost surface (more search calls per request) and a bigger
 * misuse surface (someone could try to use the criteria field as a general
 * prompt) - hence the tighter default limit.
 */
export async function discoveryRateLimiter(req, res, next) {
  try {
    const ip = req.ip;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [ipCountLastHour, globalCountLastDay] = await Promise.all([
      DiscoveryLog.countDocuments({
        requesterIp: ip,
        createdAt: { $gte: oneHourAgo },
      }),
      DiscoveryLog.countDocuments({ createdAt: { $gte: oneDayAgo } }),
    ]);

    if (ipCountLastHour >= PER_IP_LIMIT) {
      return res.status(429).json({
        error: `Discovery rate limit reached (${PER_IP_LIMIT}/hour per visitor). Try again later.`,
      });
    }

    if (globalCountLastDay >= DAILY_BUDGET_CAP) {
      return res.status(429).json({
        error:
          "This demo has hit its daily discovery budget. Please check back tomorrow.",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}
