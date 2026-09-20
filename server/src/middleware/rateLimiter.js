import { ResearchLog } from "../models/ResearchLog.js";

const PER_IP_LIMIT = Number(process.env.RESEARCH_RATE_LIMIT_PER_IP_PER_HOUR || 5);
const DAILY_BUDGET_CAP = Number(process.env.RESEARCH_DAILY_BUDGET_CAP || 50);

/**
 * Guards the live-research endpoint against runaway Anthropic API cost.
 * Two checks, both DB-backed so they survive restarts:
 *   1. This IP hasn't exceeded its hourly quota.
 *   2. The whole deployment hasn't exceeded its daily budget cap.
 * POST /research skips this for TTL cache hits and in-flight dedupe (those
 * paths do not spend Anthropic credits). Treat this as a cost ceiling, not
 * a security boundary.
 */
export async function getResearchBudgetDecision(ip) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [ipCountLastHour, globalCountLastDay] = await Promise.all([
    ResearchLog.countDocuments({ requesterIp: ip, createdAt: { $gte: oneHourAgo } }),
    ResearchLog.countDocuments({ createdAt: { $gte: oneDayAgo } }),
  ]);

  if (ipCountLastHour >= PER_IP_LIMIT) {
    return {
      ok: false,
      status: 429,
      error: `Rate limit reached (${PER_IP_LIMIT}/hour per visitor). Try again later.`,
    };
  }

  if (globalCountLastDay >= DAILY_BUDGET_CAP) {
    return {
      ok: false,
      status: 429,
      error: "This demo has hit its daily research budget. Please check back tomorrow.",
    };
  }

  return { ok: true };
}

export async function researchRateLimiter(req, res, next) {
  try {
    const decision = await getResearchBudgetDecision(req.ip);
    if (!decision.ok) {
      return res.status(decision.status).json({ error: decision.error });
    }
    next();
  } catch (err) {
    next(err);
  }
}
