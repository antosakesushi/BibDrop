import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isInviteRequired, isValidInviteCode, parseInviteCodes } from "./invite.js";

describe("invite gate", () => {
  it("parses comma-separated codes", () => {
    assert.deepEqual(parseInviteCodes(" alpha, beta, "), ["alpha", "beta"]);
  });

  it("is required when SOFT_LAUNCH=true or codes are set", () => {
    assert.equal(isInviteRequired({ softLaunch: "true", codes: [] }), true);
    assert.equal(isInviteRequired({ softLaunch: "false", codes: ["pilot"] }), true);
    assert.equal(isInviteRequired({ softLaunch: "false", codes: [] }), false);
  });

  it("rejects missing/unknown codes when the gate is on", () => {
    assert.equal(isValidInviteCode("pilot", { codes: ["pilot"], required: true }), true);
    assert.equal(isValidInviteCode("nope", { codes: ["pilot"], required: true }), false);
    assert.equal(isValidInviteCode("", { codes: ["pilot"], required: true }), false);
    assert.equal(isValidInviteCode("", { codes: [], required: true }), false);
  });

  it("allows any code when the gate is off", () => {
    assert.equal(isValidInviteCode(undefined, { codes: [], required: false }), true);
  });
});
