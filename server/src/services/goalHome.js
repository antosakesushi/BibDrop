const FALLBACK_COUNT = 3;

export function tagOverlapScore(goalTags = [], raceTags = []) {
  if (!goalTags.length) return 0;
  const set = new Set(raceTags);
  return goalTags.filter((tag) => set.has(tag)).length;
}

export function scoreRaceForGoal(goal, race) {
  let score = tagOverlapScore(goal.tags || [], race.tags || []);
  if (goal.constraints?.season && race.season === goal.constraints.season) score += 0.5;
  if (goal.constraints?.courseType && race.courseType === goal.constraints.courseType) score += 0.5;
  if (!(goal.tags || []).length && race.isWorldMajor) score += 0.25;
  return score;
}

export function nearestActionableDeadline(deadlines, now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const upcoming = (deadlines || [])
    .filter((d) => d?.date && d.dateConfidence !== "unknown" && d.isCurrent !== false)
    .filter((d) => new Date(d.date).getTime() >= start.getTime())
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || null;
}

export function pathwayLooksBlocked({ watchingMatches, nearestDeadline }) {
  if (!watchingMatches.length) return true;
  return !nearestDeadline;
}

/**
 * Rank watching/interested races that overlap the goal's tags (or all
 * flagged races if the goal has no tags). Higher score first.
 */
export function rankPathwayRaces({ goal, races, interestBySlug }) {
  const flagged = races.filter((race) => {
    const stage = interestBySlug[race.slug];
    return stage === "watching" || stage === "interested";
  });
  const tagged = (goal.tags || []).length
    ? flagged.filter((race) => scoreRaceForGoal(goal, race) > 0)
    : flagged;
  return tagged
    .map((race) => ({
      race,
      score: scoreRaceForGoal(goal, race) + (interestBySlug[race.slug] === "watching" ? 2 : 1),
      interestStage: interestBySlug[race.slug],
    }))
    .sort((a, b) => b.score - a.score || a.race.name.localeCompare(b.race.name));
}

export function fallbackSuggestions({ goal, races, excludeSlugs, limit = FALLBACK_COUNT }) {
  const exclude = new Set(excludeSlugs || []);
  const ranked = races
    .filter((race) => !exclude.has(race.slug))
    .map((race) => ({ race, score: scoreRaceForGoal(goal, race) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.race.isWorldMajor !== b.race.isWorldMajor) return a.race.isWorldMajor ? -1 : 1;
      return a.race.name.localeCompare(b.race.name);
    });
  return ranked.slice(0, limit);
}

export function buildNextAction({ pathway, nearestDeadline }) {
  if (nearestDeadline) {
    const race = nearestDeadline.race;
    return {
      kind: "deadline",
      copy: `Next: ${nearestDeadline.label || nearestDeadline.type} for ${race.name}. Confirm on the official site — BibDrop does not register for you.`,
      raceSlug: race.slug,
      raceName: race.name,
      officialUrl: race.officialUrl,
      deadlineLabel: nearestDeadline.label || nearestDeadline.type,
      date: nearestDeadline.date,
      dateConfidence: nearestDeadline.dateConfidence,
    };
  }
  const interested = pathway.find((p) => p.interestStage === "interested");
  if (interested) {
    return {
      kind: "watch",
      copy: `Nothing dated yet. Watch ${interested.race.name} if you want deadline alerts.`,
      raceSlug: interested.race.slug,
      raceName: interested.race.name,
      officialUrl: interested.race.officialUrl,
    };
  }
  if (pathway.length) {
    return {
      kind: "research",
      copy: `Research ${pathway[0].race.name} to see if a dated window is posted.`,
      raceSlug: pathway[0].race.slug,
      raceName: pathway[0].race.name,
      officialUrl: pathway[0].race.officialUrl,
    };
  }
  return {
    kind: "none",
    copy: "Nothing urgent. Add tags to this goal or browse races when you're ready.",
  };
}
