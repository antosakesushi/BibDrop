import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  QueueUnavailableError,
  buildResearchJobData,
  isSyncFallbackEnabled,
} from "./researchQueue.js";

describe("QueueUnavailableError", () => {
  it("is a 503 with a clear message (no silent sync fallback)", () => {
    const err = new QueueUnavailableError("Research queue is unavailable (REDIS_URL is not set).");
    assert.equal(err.statusCode, 503);
    assert.match(err.message, /REDIS_URL/);
  });
});

describe("RESEARCH_SYNC_FALLBACK", () => {
  it("is off unless the env flag is exactly true", () => {
    const previous = process.env.RESEARCH_SYNC_FALLBACK;
    try {
      delete process.env.RESEARCH_SYNC_FALLBACK;
      assert.equal(isSyncFallbackEnabled(), false);
      process.env.RESEARCH_SYNC_FALLBACK = "1";
      assert.equal(isSyncFallbackEnabled(), false);
      process.env.RESEARCH_SYNC_FALLBACK = "true";
      assert.equal(isSyncFallbackEnabled(), true);
    } finally {
      if (previous === undefined) delete process.env.RESEARCH_SYNC_FALLBACK;
      else process.env.RESEARCH_SYNC_FALLBACK = previous;
    }
  });
});

describe("buildResearchJobData", () => {
  it("never forwards arbitrary URLs to the worker", () => {
    const data = buildResearchJobData({
      snapshotId: "snap-1",
      raceSlug: "berlin-marathon",
      officialUrl: "https://not-from-the-registry.example",
    });
    assert.deepEqual(Object.keys(data).sort(), ["raceSlug", "snapshotId"]);
  });
});
