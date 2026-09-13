import dotenv from "../server/node_modules/dotenv/lib/main.js";
import mongoose from "../server/node_modules/mongoose/index.js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
dotenv.config({ path: "server/.env" });
process.env.MONITORING_ENABLED = "false";
process.env.RESEARCH_DAILY_BUDGET_CAP = "20";
const { Race } = await import("../server/src/models/Race.js");
const { UserRaceStatus } = await import(
  "../server/src/models/UserRaceStatus.js"
);
const { Notification } = await import("../server/src/models/Notification.js");
const { ResearchBudget } = await import(
  "../server/src/models/ResearchBudget.js"
);
const { refreshRace } = await import("../server/src/services/refreshRace.js");
const { notifyWatchers } = await import(
  "../server/src/services/notifications.js"
);
const { reserveResearchBudget } = await import(
  "../server/src/services/researchBudget.js"
);
const { app } = await import("../server/src/app.js");
const { signToken } = await import("../server/src/middleware/auth.js");
const dbName = "bibdrop_test_" + randomUUID().replaceAll("-", "").slice(0, 20);
let server;
try {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });
  await Promise.all([
    Race.init(),
    UserRaceStatus.init(),
    Notification.init(),
    ResearchBudget.init(),
  ]);
  const userId = new mongoose.Types.ObjectId(),
    otherId = new mongoose.Types.ObjectId();
  await Race.create({
    slug: "test",
    name: "Test Marathon",
    officialUrl: "https://example.org",
  });
  await UserRaceStatus.create({
    userId,
    raceSlug: "test",
    interestStage: "watching",
  });
  const result = {
    agentSummary: "Verified fixture",
    confidence: "high",
    registrationEvents: [
      {
        type: "lottery_open",
        date: "2026-10-01",
        dateConfidence: "confirmed",
        sourceUrl: "https://example.org",
      },
    ],
  };
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  let started;
  const began = new Promise((resolve) => (started = resolve));
  const first = refreshRace("test", "test", {
    research: async () => {
      started();
      await gate;
      return result;
    },
  });
  await began;
  await assert.rejects(
    refreshRace("test", "test", {
      research: async () => {
        throw Error("Duplicate research must not run");
      },
    }),
    /already in progress/,
  );
  release();
  await first;
  assert.equal(await Notification.countDocuments(), 1);
  await assert.rejects(
    refreshRace("test", "test", {
      research: async () => {
        throw Error("simulated failure");
      },
    }),
    /simulated failure/,
  );
  let race = await Race.findOne({ slug: "test" });
  assert.equal(race.agentSummary, "Verified fixture");
  assert.equal(race.researchLeaseUntil, null);
  assert.ok(race.lastMonitorError);
  await refreshRace("test", "test", {
    research: async () => ({
      ...result,
      registrationEvents: [
        { ...result.registrationEvents[0], date: "2026-10-02" },
      ],
    }),
  });
  assert.equal(await Notification.countDocuments({ userId }), 2);
  await notifyWatchers("test", { key: "test-reminder", title: "Reminder" });
  await notifyWatchers("test", { key: "test-reminder", title: "Reminder" });
  assert.equal(await Notification.countDocuments({ key: "test-reminder" }), 1);
  server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  assert.equal((await fetch(base + "/notifications")).status, 401);
  const headers = { Cookie: `bibdrop_session=${signToken(userId)}` };
  const list = await (await fetch(base + "/notifications", { headers })).json();
  assert.equal(list.length, 3);
  assert.equal(
    (
      await fetch(base + `/notifications/${list[0]._id}/read`, {
        method: "PATCH",
        headers: { Cookie: `bibdrop_session=${signToken(otherId)}` },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await fetch(base + `/notifications/${list[0]._id}/read`, {
        method: "PATCH",
        headers,
      })
    ).status,
    200,
  );
  process.env.RESEARCH_DAILY_BUDGET_CAP = "5";
  const attempts = await Promise.allSettled(
    Array.from({ length: 8 }, () => reserveResearchBudget()),
  );
  assert.equal(attempts.filter((x) => x.status === "fulfilled").length, 2); // three refresh attempts already reserved
  const { monitorTick } = await import("../server/src/jobs/monitor.js");
  process.env.RESEARCH_DAILY_BUDGET_CAP = "20";
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await Race.updateOne(
    { slug: "test" },
    {
      $set: {
        nextResearchAt: new Date(Date.now() + 86400000),
        registrationEvents: [
          {
            type: "lottery_close",
            date: tomorrow,
            dateConfidence: "confirmed",
          },
        ],
      },
    },
  );
  let calls = 0;
  const refresh = async () => {
    calls++;
  };
  await monitorTick({ refresh });
  await monitorTick({ refresh });
  assert.equal(calls, 0, "Fresh research must not be repeated");
  assert.equal(
    await Notification.countDocuments({ key: { $regex: "^reminder:test:" } }),
    1,
    "Worker reminders must be deduplicated",
  );
  await Race.updateOne(
    { slug: "test" },
    { $set: { nextResearchAt: new Date(0) } },
  );
  await monitorTick({ refresh });
  assert.equal(calls, 1, "Due watched race must be checked");
  await UserRaceStatus.updateOne(
    { userId, raceSlug: "test" },
    { $set: { entryOutcome: "registered" } },
  );
  await monitorTick({ refresh });
  assert.equal(calls, 1, "Registered runners must not trigger further checks");
  console.log(
    "PASS: real isolated MongoDB; research leases, failure retention, change alerts, reminder deduplication, authenticated ownership, concurrent budget cap. No AI calls.",
  );
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.name === dbName)
    await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
