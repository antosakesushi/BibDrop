import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isOwnedBy, normalizeGoalInput, serializeGoal, sortGoals } from "./goals.js";

describe("normalizeGoalInput", () => {
  it("requires a label on create and defaults status to active", () => {
    const patch = normalizeGoalInput({ label: "  BQ attempt 2027  ", tags: ["bq-friendly"] });
    assert.equal(patch.label, "BQ attempt 2027");
    assert.deepEqual(patch.tags, ["bq-friendly"]);
    assert.equal(patch.status, "active");
  });

  it("rejects unknown tags (must reuse race tags)", () => {
    assert.throws(
      () => normalizeGoalInput({ label: "Star", tags: ["not-a-race-tag"] }),
      (err) => err.statusCode === 400 && /Unknown tag/.test(err.message)
    );
  });

  it("rejects invalid constraint keys and values", () => {
    assert.throws(
      () => normalizeGoalInput({ label: "Major", constraints: { country: "USA" } }),
      (err) => err.statusCode === 400
    );
    assert.throws(
      () => normalizeGoalInput({ label: "Major", constraints: { season: "monsoon" } }),
      (err) => err.statusCode === 400
    );
  });

  it("accepts optional constraints used later for ranking, not Claude spend", () => {
    const patch = normalizeGoalInput({
      label: "first major",
      tags: ["world-major", "destination"],
      constraints: { season: "fall", region: "USA", courseType: "flat_fast" },
    });
    assert.deepEqual(patch.constraints, { season: "fall", region: "USA", courseType: "flat_fast" });
  });

  it("on PATCH, only updates provided fields", () => {
    const patch = normalizeGoalInput({ status: "archived" }, { partial: true });
    assert.equal(patch.status, "archived");
    assert.equal("label" in patch, false);
    assert.equal("tags" in patch, false);
  });
});

describe("goal ownership", () => {
  it("only treats matching userId as owner", () => {
    const goal = { userId: "aaaaaaaaaaaaaaaaaaaaaaaa" };
    assert.equal(isOwnedBy(goal, "aaaaaaaaaaaaaaaaaaaaaaaa"), true);
    assert.equal(isOwnedBy(goal, "bbbbbbbbbbbbbbbbbbbbbbbb"), false);
    assert.equal(isOwnedBy(null, "aaaaaaaaaaaaaaaaaaaaaaaa"), false);
  });
});

describe("sortGoals", () => {
  it("lists active goals before archived, newest first within a status", () => {
    const sorted = sortGoals([
      { status: "archived", createdAt: "2026-04-02", label: "old archived" },
      { status: "active", createdAt: "2026-04-01", label: "older active" },
      { status: "active", createdAt: "2026-04-03", label: "newer active" },
    ]);
    assert.deepEqual(
      sorted.map((g) => g.label),
      ["newer active", "older active", "old archived"]
    );
  });
});

describe("serializeGoal", () => {
  it("exposes public fields and omits userId", () => {
    const json = serializeGoal({
      _id: "cccccccccccccccccccccccc",
      userId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      label: "first major",
      tags: ["world-major"],
      constraints: { season: "spring" },
      status: "active",
      createdAt: new Date("2026-04-01"),
      updatedAt: new Date("2026-04-01"),
    });
    assert.equal(json.id, "cccccccccccccccccccccccc");
    assert.equal(json.label, "first major");
    assert.equal("userId" in json, false);
  });
});
