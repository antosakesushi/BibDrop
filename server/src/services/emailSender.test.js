import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getEmailProvider, hasEmailProvider, sendAlertEmail } from "./emailSender.js";

describe("email sender stub", () => {
  const previous = {};

  beforeEach(() => {
    for (const key of ["RESEND_API_KEY", "SENDGRID_API_KEY"]) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ["RESEND_API_KEY", "SENDGRID_API_KEY"]) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("has no provider when keys are unset", () => {
    assert.equal(getEmailProvider(), null);
    assert.equal(hasEmailProvider(), false);
  });

  it("prefers Resend over SendGrid", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.SENDGRID_API_KEY = "sg_test";
    assert.equal(getEmailProvider(), "resend");
  });

  it("no-ops send when no key is configured", async () => {
    const result = await sendAlertEmail({ to: "a@b.c", subject: "hi", text: "body" });
    assert.equal(result.sent, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, "no_provider_key");
  });
});
