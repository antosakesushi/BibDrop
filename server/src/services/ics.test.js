import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderIcs, selectWatchingCalendarEvents } from "./ics.js";

const future = new Date("2027-09-15T00:00:00Z");

describe("selectWatchingCalendarEvents", () => {
  const racesBySlug = {
    boston: { name: "Boston Marathon", officialUrl: "https://www.baa.org", slug: "boston" },
    cim: { name: "CIM", officialUrl: "https://www.runsra.org/cim", slug: "cim" },
  };

  it("includes only watching races with dated confirmed/estimated deadlines", () => {
    const events = selectWatchingCalendarEvents({
      watchingSlugs: ["boston"],
      racesBySlug,
      deadlines: [
        {
          _id: "1",
          raceSlug: "boston",
          isCurrent: true,
          date: future,
          dateConfidence: "confirmed",
          label: "Lottery closes",
          type: "lottery_close",
        },
        {
          _id: "2",
          raceSlug: "boston",
          isCurrent: true,
          date: null,
          dateConfidence: "unknown",
          label: "Waitlist",
          type: "waitlist_open",
        },
        {
          _id: "3",
          raceSlug: "cim",
          isCurrent: true,
          date: future,
          dateConfidence: "estimated",
          label: "Opens",
          type: "general_entry_open",
        },
      ],
    });
    assert.equal(events.length, 1);
    assert.match(events[0].summary, /Boston/);
    assert.match(events[0].description, /confirmed/);
    assert.match(events[0].description, /baa.org/);
  });
});

describe("renderIcs", () => {
  it("emits a VCALENDAR with official URL and confidence", () => {
    const ics = renderIcs([
      {
        uid: "deadline-1@bibdrop",
        date: future,
        summary: "Boston Marathon — Lottery closes",
        description: "Confidence: confirmed\nOfficial: https://www.baa.org",
        url: "https://www.baa.org",
      },
    ]);
    assert.match(ics, /BEGIN:VCALENDAR/);
    assert.match(ics, /DTSTART;VALUE=DATE:20270915/);
    assert.match(ics, /Confidence: confirmed/);
    assert.match(ics, /URL:https:\/\/www.baa.org/);
  });
});
