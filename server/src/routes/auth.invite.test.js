import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { authRouter } from "./auth.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-invite-http";

async function withServer(run) {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe("invite gate on register", { concurrency: false }, () => {
  const prev = {};

  before(() => {
    prev.SOFT_LAUNCH = process.env.SOFT_LAUNCH;
    prev.INVITE_CODES = process.env.INVITE_CODES;
  });

  after(() => {
    if (prev.SOFT_LAUNCH === undefined) delete process.env.SOFT_LAUNCH;
    else process.env.SOFT_LAUNCH = prev.SOFT_LAUNCH;
    if (prev.INVITE_CODES === undefined) delete process.env.INVITE_CODES;
    else process.env.INVITE_CODES = prev.INVITE_CODES;
  });

  it("exposes inviteRequired on GET /api/auth/config", async () => {
    process.env.SOFT_LAUNCH = "true";
    delete process.env.INVITE_CODES;
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/auth/config`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.inviteRequired, true);
      assert.equal(body.softLaunch, true);
    });
  });

  it("rejects register without a code when SOFT_LAUNCH=true", async () => {
    process.env.SOFT_LAUNCH = "true";
    delete process.env.INVITE_CODES;
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "pilot@example.com", password: "longenough" }),
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.error, /invite/i);
    });
  });

  it("rejects an unknown invite code", async () => {
    process.env.SOFT_LAUNCH = "false";
    process.env.INVITE_CODES = "pilot-alpha";
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "pilot@example.com",
          password: "longenough",
          inviteCode: "nope",
        }),
      });
      assert.equal(res.status, 403);
    });
  });
});
