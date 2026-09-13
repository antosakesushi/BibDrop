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
test("full fetched official date tables reach extraction even when notes omit them", () => {
  const text = researchText({
    content: [
      { type: "text", text: "Dates need review" },
      {
        type: "web_fetch_tool_result",
        content: {
          type: "web_fetch_result",
          url: "https://example.org/registration",
          content: {
            source: {
              type: "text",
              data: "Ballot: 16–26 December. Results: 13 January.",
            },
          },
        },
      },
    ],
  });
  assert.match(text, /16–26 December/);
  assert.match(
    text,
    /Fetched official source: https:\/\/example.org\/registration/,
  );
});
import { findExistingRace } from "../server/src/lib/raceIdentity.js";
test("discovery reuses sponsored race names without merging races sharing an organiser", () => {
  const berlin = {
    slug: "berlin",
    name: "Berlin Marathon",
    officialUrl: "https://www.bmw-berlin-marathon.com",
  };
  assert.equal(
    findExistingRace([berlin], {
      name: "BMW Berlin Marathon",
      officialUrl: "https://bmw-berlin-marathon.com/en/",
    }),
    berlin,
  );
  assert.equal(
    findExistingRace([berlin], {
      name: "Berlin Half Marathon",
      officialUrl: berlin.officialUrl,
    }),
    undefined,
  );
});
test("a known event without a date stays unknown instead of failing the whole briefing", () => {
  const result = validateResearch({
    agentSummary: "Waitlist exists; date not announced.",
    confidence: "medium",
    registrationEvents: [
      {
        type: "waitlist_open",
        date: null,
        dateConfidence: "confirmed",
        sourceUrl: "https://example.org",
      },
    ],
  });
  assert.equal(result.registrationEvents[0].dateConfidence, "unknown");
  assert.equal(
    reminders({
      slug: "test",
      name: "Test",
      registrationEvents: result.registrationEvents,
    }).length,
    0,
  );
});
test("sub-three-hour rates cannot masquerade as Boston qualification percentages", () => {
  const result = validateResearch({
    agentSummary: "Test",
    confidence: "medium",
    registrationEvents: [],
    profileFacts: [
      {
        key: "bq",
        value: "18% ran under 3 hours; no BQ rate available.",
        sourceUrl: "https://example.org",
      },
    ],
  });
  assert.equal(result.profileFacts.length, 0);
  const actual = validateResearch({
    agentSummary: "Test",
    confidence: "medium",
    registrationEvents: [],
    profileFacts: [
      {
        key: "bq",
        value: "32% of the 2022 Strava sample met their BAA age standard.",
        sourceUrl: "https://example.org",
      },
    ],
  });
  assert.equal(actual.profileFacts.length, 1);
});
