import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildDeadlineRecords,
  isDeadlineSchedulable,
  planDeadlineSupersede,
} from "./deadlines.js";

describe("buildDeadlineRecords", () => {
  const meta = { raceId: "race1", raceSlug: "boston", snapshotId: "snap1" };

  it("copies snapshot events and does not invent dates", () => {
    const rows = buildDeadlineRecords(
      [
        { type: "lottery_close", label: "Lottery closes", date: "2027-09-01", dateConfidence: "confirmed" },
        { type: "waitlist_open", label: "Waitlist", date: null, dateConfidence: "unknown" },
        { type: "general_entry_open", label: "Opens", date: "not-a-date", dateConfidence: "estimated" },
      ],
      meta
    );
    assert.equal(rows.length, 3);
    assert.equal(rows[0].dateConfidence, "confirmed");
    assert.ok(rows[0].date instanceof Date);
    assert.equal(rows[1].date, null);
    assert.equal(rows[1].dateConfidence, "unknown");
    assert.equal(rows[2].date, null);
    assert.equal(rows[2].dateConfidence, "unknown");
    assert.equal(rows[0].isCurrent, true);
    assert.equal(rows[0].snapshotId, "snap1");
  });
});

describe("planDeadlineSupersede", () => {
  it("marks prior current rows as superseded by the new same-type row", () => {
    const previous = [{ type: "lottery_close", _id: "old-close" }, { type: "waitlist_open", _id: "old-wait" }];
    const next = [{ type: "lottery_close", _id: "new-close" }, { type: "general_entry_open", _id: "new-open" }];
    const plan = planDeadlineSupersede(previous, next);
    assert.equal(plan[0].successorIndex, 0);
    assert.equal(plan[1].successorIndex, 0);
  });

  it("clears supersededBy when the new set is empty", () => {
    const plan = planDeadlineSupersede([{ type: "lottery_close" }], []);
    assert.equal(plan[0].successorIndex, null);
  });
});

describe("isDeadlineSchedulable", () => {
  it("skips null dates and unknown confidence", () => {
    assert.equal(
      isDeadlineSchedulable({ isCurrent: true, date: new Date("2027-01-01"), dateConfidence: "unknown" }),
      false
    );
    assert.equal(
      isDeadlineSchedulable({ isCurrent: true, date: null, dateConfidence: "confirmed" }),
      false
    );
    assert.equal(
      isDeadlineSchedulable({ isCurrent: true, date: new Date("2027-01-01"), dateConfidence: "estimated" }),
      true
    );
    assert.equal(
      isDeadlineSchedulable({ isCurrent: false, date: new Date("2027-01-01"), dateConfidence: "confirmed" }),
      false
    );
  });
});
