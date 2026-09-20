import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyResearchToRace,
  isFreshSucceededSnapshot,
  serializeSnapshot,
  snapshotTtlMs,
  validateResearchPayload,
} from "./researchJobs.js";
import { buildResearchJobData } from "../queue/researchQueue.js";

describe("validateResearchPayload", () => {
  const valid = {
    agentSummary: "Lottery is closed; general entry opens in March.",
    confidence: "medium",
    registrationEvents: [
      {
        type: "lottery_close",
        label: "Lottery closed",
        date: "2026-01-15",
        dateConfidence: "confirmed",
        notes: "Posted on official site",
      },
    ],
    sourceSnippets: ["Lottery closed January 15"],
    sources: [{ url: "https://official.example/register", title: "Register" }],
    model: "claude-sonnet-4-6",
    usage: { inputTokens: 10, outputTokens: 20 },
  };

  it("accepts a complete payload and normalizes dates", () => {
    const result = validateResearchPayload(valid);
    assert.equal(result.confidence, "medium");
    assert.ok(result.registrationEvents[0].date instanceof Date);
    assert.equal(Number.isNaN(result.registrationEvents[0].date.getTime()), false);
    assert.equal(result.sources[0].url, "https://official.example/register");
  });

  it("rejects an invalid event type (schema guard for the worker)", () => {
    assert.throws(
      () =>
        validateResearchPayload({
          ...valid,
          registrationEvents: [{ type: "not_a_real_event", dateConfidence: "unknown" }],
        }),
      /invalid type/
    );
  });

  it("rejects missing summary", () => {
    assert.throws(() => validateResearchPayload({ ...valid, agentSummary: "  " }), /agentSummary/);
  });

  it("defaults optional source lists", () => {
    const result = validateResearchPayload({ ...valid, sourceSnippets: undefined, sources: undefined });
    assert.deepEqual(result.sourceSnippets, []);
    assert.deepEqual(result.sources, []);
  });
});

describe("TTL reuse", () => {
  it("treats a succeeded snapshot inside the TTL window as fresh", () => {
    const now = Date.parse("2026-04-01T12:00:00Z");
    const snapshot = {
      status: "succeeded",
      finishedAt: new Date("2026-04-01T06:00:00Z"),
    };
    assert.equal(isFreshSucceededSnapshot(snapshot, now, 12 * 60 * 60 * 1000), true);
  });

  it("does not reuse a snapshot outside the TTL window", () => {
    const now = Date.parse("2026-04-01T12:00:00Z");
    const snapshot = {
      status: "succeeded",
      finishedAt: new Date("2026-03-31T00:00:00Z"),
    };
    assert.equal(isFreshSucceededSnapshot(snapshot, now, 12 * 60 * 60 * 1000), false);
  });

  it("does not reuse failed or in-flight snapshots", () => {
    const now = Date.now();
    assert.equal(
      isFreshSucceededSnapshot({ status: "failed", finishedAt: new Date(now) }, now, 12 * 60 * 60 * 1000),
      false
    );
    assert.equal(
      isFreshSucceededSnapshot({ status: "running", finishedAt: new Date(now) }, now, 12 * 60 * 60 * 1000),
      false
    );
  });

  it("defaults TTL to 12 hours", () => {
    const previous = process.env.RESEARCH_SNAPSHOT_TTL_HOURS;
    delete process.env.RESEARCH_SNAPSHOT_TTL_HOURS;
    try {
      assert.equal(snapshotTtlMs(), 12 * 60 * 60 * 1000);
    } finally {
      if (previous === undefined) delete process.env.RESEARCH_SNAPSHOT_TTL_HOURS;
      else process.env.RESEARCH_SNAPSHOT_TTL_HOURS = previous;
    }
  });
});

describe("research job payload", () => {
  it("only sends registry snapshotId + raceSlug and drops client URLs", () => {
    const data = buildResearchJobData({
      snapshotId: "abc",
      raceSlug: "boston-marathon",
      officialUrl: "https://evil.example/scrape-me",
      url: "https://evil.example",
    });
    assert.deepEqual(data, { snapshotId: "abc", raceSlug: "boston-marathon" });
    assert.equal("officialUrl" in data, false);
    assert.equal("url" in data, false);
  });

  it("refuses a job without a registry slug", () => {
    assert.throws(() => buildResearchJobData({ snapshotId: "abc" }), /raceSlug/);
  });
});

describe("serializeSnapshot", () => {
  it("exposes results for the poll endpoint and omits requester PII", () => {
    const json = serializeSnapshot({
      _id: "65aaaaaaaaaaaaaaaaaaaaaa",
      raceSlug: "boston-marathon",
      raceId: "65bbbbbbbbbbbbbbbbbbbbbb",
      status: "succeeded",
      triggeredBy: "user",
      requesterIp: "203.0.113.9",
      requesterUserId: "65cccccccccccccccccccccc",
      agentSummary: "Lottery closed.",
      confidence: "high",
      registrationEvents: [],
      sourceSnippets: ["snippet"],
      sources: [{ url: "https://www.baa.org", title: "BAA" }],
      errorMessage: null,
      model: "claude-sonnet-4-6",
      usage: { inputTokens: 1, outputTokens: 2 },
      startedAt: new Date("2026-04-01T00:00:00Z"),
      finishedAt: new Date("2026-04-01T00:01:00Z"),
      createdAt: new Date("2026-04-01T00:00:00Z"),
    });
    assert.equal(json.snapshotId, "65aaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(json.confidence, "high");
    assert.equal(json.sources[0].url, "https://www.baa.org");
    assert.equal("requesterIp" in json, false);
    assert.equal("requesterUserId" in json, false);
  });
});

describe("applyResearchToRace", () => {
  it("writes denormalized latest fields onto Race without dropping identity", () => {
    const race = {
      slug: "boston-marathon",
      officialUrl: "https://www.baa.org",
      lastResearchConfidence: "not_yet_researched",
    };
    const result = validateResearchPayload({
      agentSummary: "Done.",
      confidence: "high",
      registrationEvents: [{ type: "lottery_open", label: "Opens", dateConfidence: "unknown" }],
      sourceSnippets: ["quote"],
    });
    applyResearchToRace(race, result);
    assert.equal(race.agentSummary, "Done.");
    assert.equal(race.lastResearchConfidence, "high");
    assert.equal(race.researchSourceSnippets[0], "quote");
    assert.equal(race.slug, "boston-marathon");
    assert.equal(race.officialUrl, "https://www.baa.org");
    assert.ok(race.lastResearchedAt instanceof Date);
  });
});
