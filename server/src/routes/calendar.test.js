import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import { calendarRouter } from "./calendar.js";
import { signToken, verifyCalendarToken } from "../middleware/auth.js";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-ics-http";

async function withServer(run) {
  const app = express();
  app.use(cookieParser());
  app.use("/api", calendarRouter);
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

const USER = "aaaaaaaaaaaaaaaaaaaaaaaa";

describe("GET /api/calendar.ics auth", () => {
  it("rejects a missing token", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/calendar.ics`);
      assert.equal(res.status, 401);
    });
  });

  it("rejects a session JWT (purpose is not ics)", async () => {
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/calendar.ics?token=${encodeURIComponent(signToken(USER))}`);
      assert.equal(res.status, 401);
    });
  });

  it("requires a session cookie for the feed URL", async () => {
    await withServer(async (base) => {
      const anon = await fetch(`${base}/api/calendar/feed-url`);
      assert.equal(anon.status, 401);

      const authed = await fetch(`${base}/api/calendar/feed-url`, {
        headers: { cookie: `bibdrop_session=${signToken(USER)}` },
      });
      assert.equal(authed.status, 200);
      const body = await authed.json();
      assert.match(body.url, /calendar\.ics\?token=/);
      assert.equal(verifyCalendarToken(body.token), USER);
      assert.ok(body.howTo.google);
      assert.ok(body.howTo.apple);
    });
  });
});
