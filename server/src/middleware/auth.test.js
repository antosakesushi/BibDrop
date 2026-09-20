import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { cookieOptions, requireAuth, signCalendarToken, verifyCalendarToken, signToken } from "../middleware/auth.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ics";

describe("calendar token", () => {
  it("accepts a purpose=ics token and rejects a session token", () => {
    const ics = signCalendarToken("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(verifyCalendarToken(ics), "aaaaaaaaaaaaaaaaaaaaaaaa");
    const session = signToken("aaaaaaaaaaaaaaaaaaaaaaaa");
    assert.throws(() => verifyCalendarToken(session), /calendar/i);
    assert.throws(() => verifyCalendarToken("not-a-jwt"));
  });

  it("rejects a forged token with the wrong purpose", () => {
    const bad = jwt.sign({ userId: "aaaaaaaaaaaaaaaaaaaaaaaa", purpose: "session" }, process.env.JWT_SECRET);
    assert.throws(() => verifyCalendarToken(bad));
  });

  it("does not treat a purpose=ics token as a session cookie", () => {
    const ics = signCalendarToken("aaaaaaaaaaaaaaaaaaaaaaaa");
    const req = { cookies: { bibdrop_session: ics } };
    let status;
    const res = { status(code) { status = code; return this; }, json() { return this; } };
    let nextCalled = false;
    requireAuth(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(status, 401);
  });
});

describe("cookie options", () => {
  it("sets Secure in production and supports SameSite=None for split domains", () => {
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      COOKIE_SAMESITE: process.env.COOKIE_SAMESITE,
      COOKIE_SECURE: process.env.COOKIE_SECURE,
    };
    try {
      process.env.NODE_ENV = "production";
      delete process.env.COOKIE_SAMESITE;
      const prod = cookieOptions();
      assert.equal(prod.secure, true);
      assert.equal(prod.sameSite, "lax");
      assert.equal(prod.httpOnly, true);

      process.env.COOKIE_SAMESITE = "none";
      const split = cookieOptions();
      assert.equal(split.sameSite, "none");
      assert.equal(split.secure, true);
    } finally {
      process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.COOKIE_SAMESITE === undefined) delete process.env.COOKIE_SAMESITE;
      else process.env.COOKIE_SAMESITE = prev.COOKIE_SAMESITE;
      if (prev.COOKIE_SECURE === undefined) delete process.env.COOKIE_SECURE;
      else process.env.COOKIE_SECURE = prev.COOKIE_SECURE;
    }
  });
});
