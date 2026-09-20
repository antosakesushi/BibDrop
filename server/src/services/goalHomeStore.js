import { Goal } from "../models/Goal.js";
import { Race } from "../models/Race.js";
import { UserRaceStatus } from "../models/UserRaceStatus.js";
import { Deadline } from "../models/Deadline.js";
import { serializeGoal, sortGoals } from "./goals.js";
import {
  buildNextAction,
  fallbackSuggestions,
  nearestActionableDeadline,
  pathwayLooksBlocked,
  rankPathwayRaces,
} from "./goalHome.js";

export async function assembleGoalHome(userId) {
  const [goalDocs, races, statuses] = await Promise.all([
    Goal.find({ userId, status: "active" }),
    Race.find().sort({ name: 1 }),
    UserRaceStatus.find({ userId }),
  ]);
  const interestBySlug = Object.fromEntries(statuses.map((s) => [s.raceSlug, s.interestStage]));
  const watchingSlugs = statuses.filter((s) => s.interestStage === "watching").map((s) => s.raceSlug);
  const relevantSlugs = statuses.filter((s) => s.interestStage !== "none").map((s) => s.raceSlug);
  const deadlines = relevantSlugs.length
    ? await Deadline.find({ raceSlug: { $in: relevantSlugs }, isCurrent: true })
    : [];
  const deadlinesBySlug = {};
  for (const d of deadlines) {
    if (!deadlinesBySlug[d.raceSlug]) deadlinesBySlug[d.raceSlug] = [];
    deadlinesBySlug[d.raceSlug].push(d);
  }

  const raceBySlug = Object.fromEntries(races.map((r) => [r.slug, r]));
  const goals = sortGoals(goalDocs).map((goal) => {
    const serialized = serializeGoal(goal);
    const pathway = rankPathwayRaces({ goal: serialized, races, interestBySlug });
    const watchingMatches = pathway.filter((p) => p.interestStage === "watching");
    const dated = pathway.flatMap((p) =>
      (deadlinesBySlug[p.race.slug] || []).map((deadline) => ({
        ...(typeof deadline.toObject === "function" ? deadline.toObject() : deadline),
        race: p.race,
      }))
    );
    const nearest = nearestActionableDeadline(dated);
    const blocked = pathwayLooksBlocked({ watchingMatches, nearestDeadline: nearest });
    const exclude = new Set([
      ...pathway.map((p) => p.race.slug),
      ...watchingSlugs,
    ]);
    const fallbacks = blocked
      ? fallbackSuggestions({ goal: serialized, races, excludeSlugs: [...exclude], limit: 3 })
      : [];

    return {
      ...serialized,
      next: buildNextAction({ pathway, nearestDeadline: nearest }),
      pathway: pathway.slice(0, 6).map((p) => ({
        slug: p.race.slug,
        name: p.race.name,
        officialUrl: p.race.officialUrl,
        interestStage: p.interestStage,
        score: p.score,
        lastResearchConfidence: p.race.lastResearchConfidence,
      })),
      fallbacks: fallbacks.map((f) => ({
        slug: f.race.slug,
        name: f.race.name,
        officialUrl: f.race.officialUrl,
        tags: f.race.tags || [],
        score: f.score,
      })),
      blocked,
    };
  });

  const nothingUrgent = goals.every((g) => !g.next || g.next.kind === "none");
  return { goals, nothingUrgent, raceCount: Object.keys(raceBySlug).length };
}
