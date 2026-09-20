import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alertDedupeKey,
  computeFireAt,
  decideScanAction,
  planAlertsForWatcher,
  shouldCreateAlerts,
} from "./alertPlan.js";

const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const deadline = {
  _id: "dead1",
  isCurrent: true,
  date: future,
  dateConfidence: "confirmed",
  type: "lottery_close",
};

describe("watching gate", () => {
  it("only watching creates alert rows", () => {
    assert.equal(shouldCreateAlerts("watching"), true);
    assert.equal(shouldCreateAlerts("interested"), false);
    assert.equal(shouldCreateAlerts("none"), false);

    const watching = planAlertsForWatcher({
      interestStage: "watching",
      userId: "user1",
      raceId: "race1",
      deadlines: [deadline],
      leadDays: [14, 7, 1],
      now: new Date(),
    });
    const interested = planAlertsForWatcher({
      interestStage: "interested",
      userId: "user1",
      raceId: "race1",
      deadlines: [deadline],
      leadDays: [14, 7, 1],
    });
    assert.equal(watching.length, 3);
    assert.equal(interested.length, 0);
  });
});

describe("alert dedupe", () => {
  it("builds a stable unique key per user+deadline+leadDays+channel", () => {
    const a = alertDedupeKey({ userId: "u", deadlineId: "d", leadDays: 7, channel: "email" });
    const b = alertDedupeKey({ userId: "u", deadlineId: "d", leadDays: 7, channel: "email" });
    const c = alertDedupeKey({ userId: "u", deadlineId: "d", leadDays: 1, channel: "email" });
    assert.equal(a, b);
    assert.notEqual(a, c);

    const rows = planAlertsForWatcher({
      interestStage: "watching",
      userId: "u",
      raceId: "r",
      deadlines: [deadline],
      leadDays: [14, 7, 14],
    });
    const keys = rows.map((row) => row.dedupeKey);
    assert.equal(rows.length, 2);
    assert.equal(new Set(keys).size, keys.length);
  });

  it("does not schedule unknown or dateless deadlines", () => {
    const rows = planAlertsForWatcher({
      interestStage: "watching",
      userId: "u",
      raceId: "r",
      deadlines: [
        { _id: "a", isCurrent: true, date: null, dateConfidence: "confirmed" },
        { _id: "b", isCurrent: true, date: future, dateConfidence: "unknown" },
      ],
    });
    assert.equal(rows.length, 0);
  });
});

describe("computeFireAt", () => {
  it("returns null when the lead window has already passed", () => {
    const now = new Date("2026-04-10T00:00:00Z");
    const soon = new Date("2026-04-12T00:00:00Z");
    assert.equal(computeFireAt(soon, 14, now), null);
    assert.ok(computeFireAt(soon, 1, now) instanceof Date);
  });
});

describe("decideScanAction", () => {
  const alert = { status: "scheduled" };

  it("skips when the deadline is no longer current or unknown", () => {
    assert.equal(
      decideScanAction({ alert, deadline: { isCurrent: false, date: future, dateConfidence: "confirmed" }, hasProvider: true }).action,
      "skip"
    );
    assert.equal(
      decideScanAction({ alert, deadline: { isCurrent: true, date: future, dateConfidence: "unknown" }, hasProvider: true }).reason,
      "deadline_unknown"
    );
  });

  it("no-ops without a provider key so the row stays scheduled", () => {
    const decision = decideScanAction({
      alert,
      deadline: { isCurrent: true, date: future, dateConfidence: "confirmed" },
      hasProvider: false,
    });
    assert.equal(decision.action, "noop");
    assert.equal(decision.reason, "no_provider_key");
  });

  it("sends when the key is present and the deadline is current", () => {
    assert.equal(
      decideScanAction({
        alert,
        deadline: { isCurrent: true, date: future, dateConfidence: "estimated" },
        hasProvider: true,
      }).action,
      "send"
    );
  });
});
