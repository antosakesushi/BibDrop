import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildNextAction,
  fallbackSuggestions,
  pathwayLooksBlocked,
  rankPathwayRaces,
  scoreRaceForGoal,
  tagOverlapScore,
} from "./goalHome.js";

describe("goal home ranking", () => {
  const boston = { slug: "boston", name: "Boston Marathon", tags: ["world-major"], isWorldMajor: true, officialUrl: "https://baa.org" };
  const berlin = { slug: "berlin", name: "Berlin Marathon", tags: ["world-major", "bq-friendly"], isWorldMajor: true, officialUrl: "https://berlin" };
  const cim = { slug: "cim", name: "CIM", tags: ["bq-friendly"], isWorldMajor: false, officialUrl: "https://cim" };
  const disney = { slug: "disney", name: "Disney", tags: ["charity-heavy"], isWorldMajor: false, officialUrl: "https://disney" };

  it("scores tag overlap", () => {
    assert.equal(tagOverlapScore(["bq-friendly", "world-major"], ["bq-friendly"]), 1);
    assert.equal(scoreRaceForGoal({ tags: ["bq-friendly"] }, berlin) > scoreRaceForGoal({ tags: ["bq-friendly"] }, boston), true);
  });

  it("ranks watching/interested races that match the goal", () => {
    const ranked = rankPathwayRaces({
      goal: { tags: ["bq-friendly"] },
      races: [boston, berlin, cim, disney],
      interestBySlug: { berlin: "watching", cim: "interested", disney: "interested" },
    });
    assert.deepEqual(
      ranked.map((r) => r.race.slug),
      ["berlin", "cim"]
    );
    assert.equal(ranked[0].interestStage, "watching");
  });

  it("treats a watching pathway with no dated deadline as blocked and returns ≥3 fallbacks", () => {
    const pathway = [{ race: berlin, interestStage: "watching", score: 3 }];
    assert.equal(pathwayLooksBlocked({ watchingMatches: pathway, nearestDeadline: null }), true);
    const fallbacks = fallbackSuggestions({
      goal: { tags: ["bq-friendly"] },
      races: [boston, berlin, cim, disney],
      excludeSlugs: ["berlin"],
      limit: 3,
    });
    assert.equal(fallbacks.length, 3);
    assert.equal(fallbacks.some((f) => f.race.slug === "berlin"), false);
    assert.equal(fallbacks[0].race.slug, "cim");
  });

  it("builds a next action that does not claim to register", () => {
    const next = buildNextAction({
      pathway: [{ race: berlin, interestStage: "watching" }],
      nearestDeadline: {
        race: berlin,
        label: "Lottery closes",
        type: "lottery_close",
        date: new Date("2027-01-01"),
        dateConfidence: "confirmed",
      },
    });
    assert.equal(next.kind, "deadline");
    assert.match(next.copy, /does not register/);
    assert.equal(next.officialUrl, berlin.officialUrl);
  });
});
