import test from "node:test";
import assert from "node:assert/strict";
import {
  nextCheck,
  fingerprint,
  reminders,
  validDate,
} from "../server/src/lib/monitoring.js";
const now = new Date("2026-09-13T12:00:00Z");
test("weekly baseline and daily checks inside two weeks", () => {
  assert.equal(nextCheck({}, now).toISOString(), "2026-09-20T12:00:00.000Z");
  assert.equal(
    nextCheck(
      { registrationEvents: [{ date: "2026-09-20" }] },
      now,
    ).toISOString(),
    "2026-09-14T12:00:00.000Z",
  );
  assert.equal(
    nextCheck(
      { registrationEvents: [{ date: "2025-09-20" }] },
      now,
    ).toISOString(),
    "2026-09-20T12:00:00.000Z",
  );
});
test("change detection ignores order and prose but detects date and confidence changes", () => {
  const a = {
    type: "lottery_open",
    date: "2026-09-20",
    dateConfidence: "confirmed",
  };
  const b = {
    type: "lottery_close",
    date: "2026-09-30",
    dateConfidence: "confirmed",
  };
  assert.equal(
    fingerprint([a, b]),
    fingerprint([{ ...b, label: "Updated prose" }, a]),
  );
  assert.notEqual(
    fingerprint([a]),
    fingerprint([{ ...a, date: "2026-09-21" }]),
  );
  assert.notEqual(
    fingerprint([a]),
    fingerprint([{ ...a, dateConfidence: "estimated" }]),
  );
});
test("reminders only for confirmed dates at 7, 1, and 0 days; stable deduplication keys", () => {
  const race = {
    slug: "test",
    name: "Test",
    officialUrl: "https://example.org",
    registrationEvents: [
      { type: "lottery_open", date: "2026-09-20", dateConfidence: "confirmed" },
      {
        type: "lottery_close",
        date: "2026-09-14",
        dateConfidence: "estimated",
      },
    ],
  };
  const results = reminders(race, now);
  assert.equal(results.length, 1);
  assert.match(results[0].body, /In 7 days/);
  assert.equal(
    results[0].key,
    reminders(race, new Date("2026-09-13T23:59Z"))[0].key,
  );
  assert.equal(reminders(race, new Date("2026-09-21")).length, 0);
  assert.equal(reminders(race, new Date("2026-09-19")).length, 1);
  assert.equal(reminders(race, new Date("2026-09-20T23:59Z")).length, 1);
});
test("invalid calendar dates cannot become reminders", () => {
  assert.equal(validDate("2026-02-30"), null);
  assert.equal(validDate(null), null);
});
import {
  validateResearch,
  researchText,
} from "../server/src/lib/researchValidation.js";
test("confirmed facts need sources and invalid dates are rejected", () => {
  const result = {
    agentSummary: "Test",
    confidence: "high",
    registrationEvents: [
      {
        type: "lottery_open",
        dateConfidence: "confirmed",
        date: "2026-02-30",
        sourceUrl: "https://example.org",
      },
    ],
  };
  assert.throws(() => validateResearch(result), /invalid registration/);
  result.registrationEvents[0].date = "2026-02-28";
  delete result.registrationEvents[0].sourceUrl;
  assert.throws(() => validateResearch(result), /source URL/);
  result.registrationEvents[0].sourceUrl = "https://example.org";
  assert.equal(validateResearch(result), result);
});
test("extraction receives web citation URLs alongside narrative findings", () => {
  assert.match(
    researchText({
      content: [
        {
          type: "text",
          text: "Window opens",
          citations: [
            { url: "https://example.org/entry", title: "Official entry" },
          ],
        },
      ],
    }),
    /https:\/\/example.org\/entry/,
  );
});
