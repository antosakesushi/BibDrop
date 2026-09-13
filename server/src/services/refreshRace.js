import { reserveResearchBudget } from "./researchBudget.js";
import { randomUUID } from "node:crypto";
import { Race } from "../models/Race.js";
import { ResearchLog } from "../models/ResearchLog.js";
import { researchRace } from "./claudeResearch.js";
import { fingerprint, nextCheck } from "../lib/monitoring.js";
import { flushRaceAlerts } from "./notifications.js";

export async function refreshRace(
  slug,
  requesterIp = "monitor",
  { research = researchRace } = {},
) {
  const now = new Date(),
    token = randomUUID();
  const race = await Race.findOneAndUpdate(
    {
      slug,
      $or: [
        { researchLeaseUntil: { $exists: false } },
        { researchLeaseUntil: null },
        { researchLeaseUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        researchLeaseUntil: new Date(+now + 15 * 60000),
        researchLeaseToken: token,
      },
    },
    { new: true },
  );
  if (!race) {
    const e = new Error("Race unavailable or research already in progress.");
    e.status = 409;
    throw e;
  }
  let log;
  try {
    // Reserve the attempt before the paid call, including failed requests in the budget.
    await reserveResearchBudget();
    log = await ResearchLog.create({
      raceSlug: slug,
      requesterIp,
      succeeded: false,
    });
    const result = await research(race);
    const changed =
      fingerprint(race.registrationEvents) !==
      fingerprint(result.registrationEvents);
    const fields = {
      registrationEvents: result.registrationEvents || [],
      edition: result.edition,
      raceDate: result.raceDate || null,
      profileFacts: result.profileFacts || [],
      researchSources: result.researchSources || [],
      agentSummary: result.agentSummary,
      lastResearchConfidence: result.confidence,
      lastResearchedAt: new Date(),
      researchSourceSnippets: result.sourceSnippets || [],
      lastMonitorError: null,
      researchLeaseUntil: null,
      researchLeaseToken: null,
    };
    fields.nextResearchAt = nextCheck(fields);
    const update = { $set: fields };
    if (changed)
      update.$push = {
        pendingAlerts: {
          key: `change:${slug}:${token}`,
          title: `${race.name}: registration information updated`,
          body: "The latest research updated the entry timeline. Review the dates and sources before making your next move.",
          sourceUrl: race.officialUrl,
        },
      };
    const saved = await Race.findOneAndUpdate(
      { slug, researchLeaseToken: token },
      update,
      { new: true, runValidators: true },
    );
    if (!saved)
      throw new Error("Research lease expired; result was not applied.");
    await ResearchLog.updateOne(
      { _id: log._id },
      { $set: { succeeded: true } },
    );
    await flushRaceAlerts(slug).catch((e) =>
      console.error("[alerts] Delivery will retry:", slug, e.message),
    );
    return saved;
  } catch (e) {
    await Race.updateOne(
      { slug, researchLeaseToken: token },
      {
        $set: {
          researchLeaseUntil: null,
          researchLeaseToken: null,
          lastMonitorError:
            "The latest check failed. Previous findings are retained.",
          nextResearchAt: new Date(Date.now() + 3600000),
        },
      },
    );
    if (log)
      await ResearchLog.updateOne(
        { _id: log._id },
        { $set: { errorMessage: e.message } },
      );
    throw e;
  }
}
